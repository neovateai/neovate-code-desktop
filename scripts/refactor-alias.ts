#!/usr/bin/env bun

/**
 * Refactor @/ alias imports to relative paths using ts-morph.
 *
 * Usage:
 *   bun scripts/refactor-alias.ts --dry-run  # Preview changes
 *   bun scripts/refactor-alias.ts            # Apply changes
 *
 * Requires: npm install --save-dev ts-morph
 */

import { Project } from 'ts-morph';
import { relative, dirname } from 'node:path';

const ALIAS_PREFIX = '@/';
const ALIAS_TARGET = 'src/renderer';

interface ParsedArgs {
  help: boolean;
  dryRun: boolean;
}

function parseArgs(): ParsedArgs {
  const args = Bun.argv.slice(2);
  return {
    help: args.includes('-h') || args.includes('--help'),
    dryRun: args.includes('-n') || args.includes('--dry-run'),
  };
}

function showHelp(): void {
  console.log(`
Usage: bun scripts/refactor-alias.ts [options]

Refactor @/ alias imports to relative paths.

Options:
  -h, --help     Show this help message
  -n, --dry-run  Preview changes without writing files

Examples:
  bun scripts/refactor-alias.ts --dry-run
  bun scripts/refactor-alias.ts
`);
}

function resolveAliasToRelative(
  fromFilePath: string,
  aliasPath: string,
  projectRoot: string,
): string {
  // @/lib/utils -> src/renderer/lib/utils
  const targetPath = aliasPath.replace(ALIAS_PREFIX, `${ALIAS_TARGET}/`);
  const absoluteTarget = `${projectRoot}/${targetPath}`;

  // Calculate relative path from the importing file
  const fromDir = dirname(fromFilePath);
  let relativePath = relative(fromDir, absoluteTarget);

  // Convert to posix style (forward slashes)
  relativePath = relativePath.split('\\').join('/');

  // Ensure it starts with ./ or ../
  if (!relativePath.startsWith('.')) {
    relativePath = `./${relativePath}`;
  }

  return relativePath;
}

async function main(): Promise<void> {
  const args = parseArgs();

  if (args.help) {
    showHelp();
    process.exit(0);
  }

  const projectRoot = process.cwd();

  const project = new Project({
    tsConfigFilePath: `${projectRoot}/tsconfig.json`,
  });

  // Also add files not covered by tsconfig (like config files)
  project.addSourceFilesAtPaths([
    `${projectRoot}/electron.vite.config.ts`,
    `${projectRoot}/vitest.config.ts`,
  ]);

  const sourceFiles = project.getSourceFiles();
  let totalChanges = 0;
  const changedFiles: string[] = [];

  for (const sourceFile of sourceFiles) {
    const filePath = sourceFile.getFilePath();
    const imports = sourceFile.getImportDeclarations();
    let fileChanges = 0;

    for (const importDecl of imports) {
      const moduleSpecifier = importDecl.getModuleSpecifierValue();

      if (moduleSpecifier.startsWith(ALIAS_PREFIX)) {
        const newPath = resolveAliasToRelative(
          filePath,
          moduleSpecifier,
          projectRoot,
        );

        if (args.dryRun) {
          console.log(`${relative(projectRoot, filePath)}:`);
          console.log(`  ${moduleSpecifier} -> ${newPath}`);
        } else {
          importDecl.setModuleSpecifier(newPath);
        }

        fileChanges++;
        totalChanges++;
      }
    }

    // Also handle dynamic imports and re-exports
    const exportDeclarations = sourceFile.getExportDeclarations();
    for (const exportDecl of exportDeclarations) {
      const moduleSpecifier = exportDecl.getModuleSpecifierValue();
      if (moduleSpecifier?.startsWith(ALIAS_PREFIX)) {
        const newPath = resolveAliasToRelative(
          filePath,
          moduleSpecifier,
          projectRoot,
        );

        if (args.dryRun) {
          console.log(`${relative(projectRoot, filePath)}:`);
          console.log(`  export ${moduleSpecifier} -> ${newPath}`);
        } else {
          exportDecl.setModuleSpecifier(newPath);
        }

        fileChanges++;
        totalChanges++;
      }
    }

    if (fileChanges > 0) {
      changedFiles.push(relative(projectRoot, filePath));
    }
  }

  if (args.dryRun) {
    console.log(`\nTotal: ${totalChanges} imports in ${changedFiles.length} files`);
    console.log('\nRun without --dry-run to apply changes.');
  } else {
    await project.save();
    console.log(`Refactored ${totalChanges} imports in ${changedFiles.length} files:`);
    changedFiles.forEach((f) => console.log(`  - ${f}`));
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
