#!/usr/bin/env bun

interface UpgradeArgs {
  help: boolean;
  dryRun: boolean;
}

function parseArgs(): UpgradeArgs {
  const args = Bun.argv.slice(2);
  return {
    help: args.includes('-h') || args.includes('--help'),
    dryRun: args.includes('-n') || args.includes('--dry-run'),
  };
}

function showHelp(): void {
  console.log(`
Usage: bun scripts/upgrade-neovate-code.ts [options]

Upgrade @neovate/code to the latest version.

Options:
  -h, --help     Show this help message
  -n, --dry-run  Show what would be done without making changes

Examples:
  bun scripts/upgrade-neovate-code.ts
  bun scripts/upgrade-neovate-code.ts --dry-run
`);
}

async function getLatestVersion(): Promise<string> {
  const response = await fetch(
    'https://registry.npmjs.org/@neovate/code/latest',
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch latest version: ${response.statusText}`);
  }
  const data = await response.json();
  return data.version;
}

async function getCurrentVersion(): Promise<string> {
  const packageJson = await Bun.file('package.json').json();
  const currentVersion = packageJson.dependencies?.['@neovate/code'];
  if (!currentVersion) {
    throw new Error('@neovate/code not found in dependencies');
  }
  return currentVersion.replace(/^\^/, '');
}

async function updatePackageJson(newVersion: string): Promise<void> {
  const content = await Bun.file('package.json').text();
  const updated = content.replace(
    /"@neovate\/code":\s*"\^?[\d.]+"/,
    `"@neovate/code": "^${newVersion}"`,
  );
  await Bun.write('package.json', updated);
}

async function runNpmInstall(): Promise<void> {
  const proc = Bun.spawn(['npm', 'install'], {
    stdout: 'inherit',
    stderr: 'inherit',
  });
  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    throw new Error(`npm install failed with exit code ${exitCode}`);
  }
}

async function main(): Promise<void> {
  const args = parseArgs();
  if (args.help) {
    showHelp();
    process.exit(0);
  }

  console.log('Fetching latest version of @neovate/code...');
  const latestVersion = await getLatestVersion();
  const currentVersion = await getCurrentVersion();

  console.log(`Current version: ${currentVersion}`);
  console.log(`Latest version:  ${latestVersion}`);

  if (currentVersion === latestVersion) {
    console.log('Already on the latest version.');
    return;
  }

  if (args.dryRun) {
    console.log(
      `\nDry run: would upgrade ${currentVersion} -> ${latestVersion}`,
    );
    return;
  }

  console.log(`\nUpgrading ${currentVersion} -> ${latestVersion}...`);
  await updatePackageJson(latestVersion);
  console.log('Updated package.json');

  console.log('\nRunning npm install...');
  await runNpmInstall();

  console.log('\nDone!');
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
