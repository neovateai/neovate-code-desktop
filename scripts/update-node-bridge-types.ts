#!/usr/bin/env bun

interface UpdateTypesArgs {
  help: boolean;
  source: string;
  dest: string;
  dryRun: boolean;
}

function parseArgs(): UpdateTypesArgs {
  const args = Bun.argv.slice(2);
  const sourceArg = args.find((a) => a.startsWith('--source='))?.split('=')[1];
  const source = sourceArg ?? process.env.NODE_BRIDGE_TYPE;
  if (!source) {
    throw new Error(
      'Source not specified. Set NODE_BRIDGE_TYPE env or use --source=PATH',
    );
  }
  return {
    help: args.includes('-h') || args.includes('--help'),
    source,
    dest:
      args.find((a) => a.startsWith('--dest='))?.split('=')[1] ??
      'src/renderer/nodeBridge.types.ts',
    dryRun: args.includes('-n') || args.includes('--dry-run'),
  };
}

function showHelp(): void {
  console.log(`
Usage: bun scripts/update-node-bridge-types.ts [options]

Copy nodeBridge.types.ts and replace external type imports with \`type X = any;\`

Options:
  -h, --help       Show this help message
  --source=PATH    Source file path (required if NODE_BRIDGE_TYPE not set)
  --dest=PATH      Destination file path (default: src/renderer/nodeBridge.types.ts)

Environment:
  NODE_BRIDGE_TYPE    Default source file path (required if --source not provided)

Examples:
  NODE_BRIDGE_TYPE=/path/to/source.ts bun scripts/update-node-bridge-types.ts
  bun scripts/update-node-bridge-types.ts --source=/path/to/source.ts
`);
}

function extractTypeNames(importLine: string): string[] {
  const match = importLine.match(/import\s+type\s*\{([^}]+)\}/);
  if (!match) return [];
  return match[1]
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

const TYPE_OVERRIDES: Record<string, string> = {
  ModelInfo: `type Provider = Record<string, any>;
type ModelInfo = {
  provider: Provider;
  model: any;
  thinkingConfig?: Record<string, any>;
  _mCreator: () => Promise<any>;
};`,
  ProvidersMap: `type ProvidersMap = Record<string, Provider>;`,
};

function processContent(content: string): string {
  const lines = content.split('\n');
  const typeNames: string[] = [];
  const processedLines: string[] = [];

  for (const line of lines) {
    if (line.match(/^import\s+type\s*\{[^}]+\}\s*from\s*['"]\.\//)) {
      const names = extractTypeNames(line);
      typeNames.push(...names);
      processedLines.push(`// ${line}`);
    } else {
      processedLines.push(line);
    }
  }

  if (typeNames.length > 0) {
    const typeDeclarations = typeNames.map(
      (name) => TYPE_OVERRIDES[name] ?? `type ${name} = any;`,
    );
    const insertIndex = processedLines.findIndex((l) =>
      l.startsWith('// import type'),
    );
    if (insertIndex !== -1) {
      let lastImportIndex = insertIndex;
      for (let i = insertIndex; i < processedLines.length; i++) {
        if (processedLines[i].startsWith('// import type')) {
          lastImportIndex = i;
        } else if (processedLines[i].trim() !== '') {
          break;
        }
      }
      processedLines.splice(lastImportIndex + 1, 0, '', ...typeDeclarations);
    }
  }

  // Replace inline import('./context').Context with any
  return processedLines
    .join('\n')
    .replace(/import\(['"]\.\/context['"]\)\.Context/g, 'any');
}

async function main(): Promise<void> {
  const args = parseArgs();
  if (args.help) {
    showHelp();
    process.exit(0);
  }

  const sourceFile = Bun.file(args.source);
  if (!(await sourceFile.exists())) {
    throw new Error(`Source file not found: ${args.source}`);
  }

  const content = await sourceFile.text();
  const processed = processContent(content);

  await Bun.write(args.dest, processed);
  console.log(`Updated ${args.dest}`);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
