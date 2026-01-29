#!/usr/bin/env bun
import { $ } from 'bun';
import { execSync } from 'child_process';

async function main() {
  console.log('🚀 Starting ready check...\n');

  // Step 1: Run format and check for git changes
  console.log('🎨 Running formatter...');
  try {
    await $`npm run format -- --write`.quiet();

    // Check if there are any unstaged changes (modified but not staged)
    const gitStatus = execSync('git diff --name-only', { encoding: 'utf-8' });
    if (gitStatus.trim()) {
      console.error(
        '❌ Format check failed: There are unstaged changes after formatting',
      );
      console.error('Changed files:');
      console.error(gitStatus);
      process.exit(1);
    }
    console.log('✅ Format check passed\n');
  } catch (error) {
    console.error('❌ Format check failed:', error);
    process.exit(1);
  }

  // Step 2: Run typecheck
  console.log('🔍 Running typecheck...');
  try {
    await $`npm run typecheck`.quiet();
    console.log('✅ Typecheck passed\n');
  } catch (error) {
    console.error('❌ Typecheck failed:', error);
    process.exit(1);
  }

  console.log('🎉 All checks passed! Project is ready.');
}

main().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
