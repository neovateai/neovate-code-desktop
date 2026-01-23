#!/usr/bin/env bun

/**
 * Interactive dependency upgrade script
 * - Fetches latest versions from npm registry
 * - Lets user select which deps to upgrade
 * - Preserves version prefixes (^, ~, etc.)
 */

interface ParsedArgs {
  help: boolean;
  dryRun: boolean;
  packagePath: string;
}

interface DepInfo {
  name: string;
  currentVersion: string;
  prefix: string; // ^, ~, or empty
  latestVersion: string | null;
  type: 'dependencies' | 'devDependencies';
}

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  [key: string]: unknown;
}

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function parseArgs(): ParsedArgs {
  const args = Bun.argv.slice(2);
  return {
    help: args.includes('-h') || args.includes('--help'),
    dryRun: args.includes('-d') || args.includes('--dry-run'),
    packagePath: args.find((a) => !a.startsWith('-')) || 'package.json',
  };
}

function showHelp(): void {
  console.log(`
${colors.bold}Usage:${colors.reset} bun scripts/upgrade-deps.ts [options] [package.json path]

${colors.bold}Description:${colors.reset}
  Interactive dependency upgrade tool. Checks npm registry for latest versions
  and lets you select which packages to upgrade.

${colors.bold}Options:${colors.reset}
  -h, --help      Show this help message
  -d, --dry-run   Show what would be updated without writing

${colors.bold}Examples:${colors.reset}
  bun scripts/upgrade-deps.ts
  bun scripts/upgrade-deps.ts --dry-run
  bun scripts/upgrade-deps.ts ./packages/core/package.json

${colors.bold}Selection:${colors.reset}
  Enter comma-separated numbers (e.g., 1,3,5) or 'all' to select all
  Press Enter with empty input to cancel
`);
}

function parseVersionPrefix(version: string): {
  prefix: string;
  version: string;
} {
  const match = version.match(/^([~^]|>=?|<=?)?(.+)$/);
  if (match) {
    return { prefix: match[1] || '', version: match[2] };
  }
  return { prefix: '', version };
}

async function loadPackageJson(
  path: string,
): Promise<{ content: string; json: PackageJson }> {
  const file = Bun.file(path);
  if (!(await file.exists())) {
    throw new Error(`File not found: ${path}`);
  }
  const content = await file.text();
  const json = JSON.parse(content) as PackageJson;
  return { content, json };
}

function collectDeps(pkg: PackageJson): Omit<DepInfo, 'latestVersion'>[] {
  const deps: Omit<DepInfo, 'latestVersion'>[] = [];

  const processDeps = (
    record: Record<string, string> | undefined,
    type: 'dependencies' | 'devDependencies',
  ) => {
    if (!record) return;
    for (const [name, version] of Object.entries(record)) {
      const { prefix, version: cleanVersion } = parseVersionPrefix(version);
      deps.push({ name, currentVersion: cleanVersion, prefix, type });
    }
  };

  processDeps(pkg.dependencies, 'dependencies');
  processDeps(pkg.devDependencies, 'devDependencies');

  return deps;
}

async function fetchLatestVersion(name: string): Promise<string | null> {
  try {
    const res = await fetch(`https://registry.npmjs.org/${name}/latest`);
    if (!res.ok) return null;
    const data = (await res.json()) as { version: string };
    return data.version;
  } catch {
    return null;
  }
}

async function fetchLatestVersions(
  deps: Omit<DepInfo, 'latestVersion'>[],
  concurrency = 10,
): Promise<DepInfo[]> {
  const results: DepInfo[] = [];
  const total = deps.length;

  // Process in batches
  for (let i = 0; i < deps.length; i += concurrency) {
    const batch = deps.slice(i, i + concurrency);
    const promises = batch.map(async (dep) => {
      const latestVersion = await fetchLatestVersion(dep.name);
      return { ...dep, latestVersion };
    });

    const batchResults = await Promise.all(promises);
    results.push(...batchResults);

    // Progress indicator
    const done = Math.min(i + concurrency, total);
    process.stdout.write(
      `\r${colors.dim}Checking versions... ${done}/${total}${colors.reset}`,
    );
  }
  console.log(); // New line after progress

  return results;
}

function filterOutdated(deps: DepInfo[]): DepInfo[] {
  return deps.filter((dep) => {
    if (!dep.latestVersion) return false;
    return dep.currentVersion !== dep.latestVersion;
  });
}

async function promptSelection(outdated: DepInfo[]): Promise<number[]> {
  console.log(`\n${colors.bold}Outdated packages:${colors.reset}\n`);

  outdated.forEach((dep, i) => {
    const typeLabel =
      dep.type === 'devDependencies' ? colors.dim + '(dev)' + colors.reset : '';
    console.log(
      `  ${colors.cyan}${(i + 1).toString().padStart(2)}.${colors.reset} ${dep.name} ${typeLabel}`,
    );
    console.log(
      `      ${colors.red}${dep.prefix}${dep.currentVersion}${colors.reset} → ${colors.green}${dep.prefix}${dep.latestVersion}${colors.reset}`,
    );
  });

  console.log(
    `\n${colors.dim}Enter numbers (e.g., 1,3,5), 'all', or empty to cancel:${colors.reset}`,
  );
  process.stdout.write('> ');

  const input = await readLine();
  const trimmed = input.trim().toLowerCase();

  if (!trimmed) return [];
  if (trimmed === 'all') return outdated.map((_, i) => i);

  const indices: number[] = [];
  const parts = trimmed.split(',').map((s) => s.trim());

  for (const part of parts) {
    // Support ranges like "1-5"
    if (part.includes('-')) {
      const [start, end] = part.split('-').map((n) => parseInt(n, 10));
      if (!isNaN(start) && !isNaN(end)) {
        for (let i = start; i <= end; i++) {
          if (i >= 1 && i <= outdated.length) {
            indices.push(i - 1);
          }
        }
      }
    } else {
      const num = parseInt(part, 10);
      if (!isNaN(num) && num >= 1 && num <= outdated.length) {
        indices.push(num - 1);
      }
    }
  }

  return [...new Set(indices)]; // Remove duplicates
}

async function readLine(): Promise<string> {
  const buf = new Uint8Array(1024);
  const n = await Bun.stdin.stream().getReader().read();
  if (n.value) {
    return new TextDecoder().decode(n.value).trim();
  }
  return '';
}

function updatePackageJson(content: string, selected: DepInfo[]): string {
  let updated = content;

  for (const dep of selected) {
    if (!dep.latestVersion) continue;

    const oldVersion = `${dep.prefix}${dep.currentVersion}`;
    const newVersion = `${dep.prefix}${dep.latestVersion}`;

    // Use regex to precisely match the dependency line
    const regex = new RegExp(
      `("${escapeRegex(dep.name)}"\\s*:\\s*")${escapeRegex(oldVersion)}"`,
      'g',
    );
    updated = updated.replace(regex, `$1${newVersion}"`);
  }

  return updated;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function summarize(selected: DepInfo[]): void {
  console.log(
    `\n${colors.bold}${colors.green}✓ Updated ${selected.length} package(s):${colors.reset}\n`,
  );

  for (const dep of selected) {
    console.log(
      `  ${colors.cyan}${dep.name}${colors.reset}: ${dep.prefix}${dep.currentVersion} → ${colors.green}${dep.prefix}${dep.latestVersion}${colors.reset}`,
    );
  }

  console.log(
    `\n${colors.dim}Run 'npm install' to apply changes.${colors.reset}`,
  );
}

async function main(): Promise<void> {
  const args = parseArgs();

  if (args.help) {
    showHelp();
    process.exit(0);
  }

  console.log(`${colors.bold}Dependency Upgrade Tool${colors.reset}\n`);

  // Step 1: Load package.json
  console.log(`${colors.dim}Loading ${args.packagePath}...${colors.reset}`);
  const { content, json } = await loadPackageJson(args.packagePath);

  // Step 2: Collect all deps
  const allDeps = collectDeps(json);
  console.log(
    `${colors.dim}Found ${allDeps.length} dependencies${colors.reset}`,
  );

  // Step 3: Fetch latest versions
  const withLatest = await fetchLatestVersions(allDeps);

  // Step 4: Filter outdated
  const outdated = filterOutdated(withLatest);

  if (outdated.length === 0) {
    console.log(
      `\n${colors.green}✓ All dependencies are up to date!${colors.reset}`,
    );
    process.exit(0);
  }

  console.log(
    `${colors.yellow}Found ${outdated.length} outdated package(s)${colors.reset}`,
  );

  // Step 5: Prompt user selection
  const selectedIndices = await promptSelection(outdated);

  if (selectedIndices.length === 0) {
    console.log(
      `\n${colors.dim}No packages selected. Cancelled.${colors.reset}`,
    );
    process.exit(0);
  }

  const selected = selectedIndices.map((i) => outdated[i]);

  // Step 6: Update package.json
  const updatedContent = updatePackageJson(content, selected);

  if (args.dryRun) {
    console.log(`\n${colors.yellow}[DRY RUN] Would update:${colors.reset}`);
    summarize(selected);
    process.exit(0);
  }

  await Bun.write(args.packagePath, updatedContent);

  // Step 7: Summarize
  summarize(selected);
}

main().catch((err) => {
  console.error(`${colors.red}Error:${colors.reset}`, err.message);
  process.exit(1);
});
