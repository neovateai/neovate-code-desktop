#!/usr/bin/env bun

import { spawn } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

const UI_DIR = join(import.meta.dir, '../src/renderer/components/ui');
const EXCLUDED = ['index', 'context-menu'];

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
Usage: bun scripts/update-ui-components.ts [options]

Update UI components from @coss/shadcn registry.

Lists components in src/renderer/components/ui, filters out index and 
context-menu, then runs shadcn add for each component.

Options:
  -h, --help     Show this help message
  -n, --dry-run  Preview commands without executing

Examples:
  bun scripts/update-ui-components.ts --dry-run
  bun scripts/update-ui-components.ts
`);
}

async function getComponents(): Promise<string[]> {
  const files = await readdir(UI_DIR);
  return files
    .filter((f) => f.endsWith('.tsx'))
    .map((f) => f.replace('.tsx', ''))
    .filter((name) => !EXCLUDED.includes(name));
}

async function runShadcn(component: string): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn(
      'bunx',
      ['--bun', 'shadcn@latest', 'add', `@coss/${component}`, '-y', '-o'],
      {
        stdio: 'inherit',
        shell: true,
      },
    );

    proc.on('close', (code) => {
      resolve(code === 0);
    });

    proc.on('error', () => {
      resolve(false);
    });
  });
}

async function main(): Promise<void> {
  const args = parseArgs();

  if (args.help) {
    showHelp();
    process.exit(0);
  }

  const components = await getComponents();
  console.log(`Found ${components.length} components to update:\n`);
  components.forEach((c) => console.log(`  - ${c}`));
  console.log();

  if (args.dryRun) {
    console.log('Commands that would be run:\n');
    for (const component of components) {
      console.log(`  bunx --bun shadcn@latest add @coss/${component}`);
    }
    console.log('\nRun without --dry-run to execute.');
    return;
  }

  const results: { component: string; success: boolean }[] = [];

  for (let i = 0; i < components.length; i++) {
    const component = components[i];
    console.log(`[${i + 1}/${components.length}] Adding @coss/${component}...`);
    const success = await runShadcn(component);
    results.push({ component, success });
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('Summary:');
  console.log('='.repeat(50));

  const succeeded = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  console.log(`✓ Succeeded: ${succeeded.length}`);
  if (failed.length > 0) {
    console.log(`✗ Failed: ${failed.length}`);
    failed.forEach((r) => console.log(`  - ${r.component}`));
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
