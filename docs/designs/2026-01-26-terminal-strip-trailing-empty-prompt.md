# Terminal Strip Trailing Empty Prompt

**Date:** 2026-01-26
**Status:** Implemented

## Context

When terminal state is restored after app restart, users see duplicate prompts:
1. The old saved prompt from the persisted `serializedBuffer`
2. A new prompt from the freshly spawned PTY/shell

This happens because the terminal persistence system saves the entire XTerm buffer including the trailing empty prompt (e.g., `❯ ` waiting for input). When restored, this old prompt is written to XTerm, then a new PTY spawns and outputs its own prompt, resulting in two stacked prompts.

## Discussion

Three approaches were considered:

**A) Strip the trailing prompt from saved buffer before restoring** — Detect and remove the last empty prompt line before writing to xterm during restore.

**B) Clear the terminal before new PTY spawns** — After writing saved buffer, send a clear command or position cursor to overwrite the old prompt.

**C) Don't save the trailing empty prompt** — During save, detect if the last line is just an empty prompt and exclude it from persistence.

Option C was chosen as the cleanest approach since it addresses the problem at the source (save time) rather than as a workaround at restore time.

### Detecting Empty Prompts

The challenge is distinguishing between:
- **Command lines**: prompt indicator (`❯`, `$`, `%`, `>`) followed by actual command text
- **Empty prompts**: prompt indicator followed by nothing or just whitespace/zsh markers
- **Prompt context**: multi-line prompt elements like path info, git status (starship/powerlevel10k style)
- **Command output**: actual terminal output from executed commands

Example terminal buffer structure:
```
Line 16: 'Code/test/test-ami via  v22.21.1 '   # prompt context
Line 17: '❯ pwd'                                # prompt + COMMAND
Line 18: '/Users/chencheng/...'                 # OUTPUT
Line 19: ''                                     # empty line
Line 20: 'Code/test/test-ami via  v22.21.1 '   # prompt context (trailing)
Line 21: '❯ %                              '   # EMPTY PROMPT (just %)
```

The solution walks backwards from the end of the buffer to find the last line with actual command content, then truncates everything after it.

## Approach

Add a `stripTrailingEmptyPrompt()` function that:
1. Splits the serialized buffer by `\r\n`
2. Walks backwards from the end
3. For each line, strips ANSI escape codes and determines if it's:
   - An empty prompt (prompt indicator + no command text)
   - Prompt context (path info, git status, etc.)
   - Actual command output
4. Stops at the last line with real content
5. Returns the buffer truncated to include only up to that line (plus one trailing empty line for formatting)

## Architecture

### Modified Files

- `src/renderer/components/ContentPanel/panes/TerminalPane.tsx`

### New Function

```typescript
function stripTrailingEmptyPrompt(buffer: string): string {
  const lines = buffer.split('\r\n');
  const promptIndicators = ['❯', '$', '%', '>'];
  const stripAnsi = (str: string) => str.replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, '');

  let lastContentLineIndex = -1;

  for (let i = lines.length - 1; i >= 0; i--) {
    const cleanLine = stripAnsi(lines[i]).trim();
    if (cleanLine === '') continue;

    const startsWithPrompt = promptIndicators.some(p => cleanLine.startsWith(p));

    if (startsWithPrompt) {
      const promptChar = promptIndicators.find(p => cleanLine.startsWith(p));
      const afterPrompt = cleanLine.slice(promptChar?.length || 1).trim();
      // Has actual command text (not just % marker)
      if (afterPrompt && afterPrompt !== '%' && !/^%\s*$/.test(afterPrompt)) {
        lastContentLineIndex = i;
        break;
      }
    } else {
      // Check if it's prompt context vs actual output
      const looksLikePromptContext =
        cleanLine.includes('via ') ||
        cleanLine.includes(' on ') ||
        /^[~\/]/.test(cleanLine) ||
        /^\[.*\]$/.test(cleanLine);

      if (!looksLikePromptContext) {
        lastContentLineIndex = i;
        break;
      }
    }
  }

  if (lastContentLineIndex >= 0) {
    let endIndex = lastContentLineIndex + 1;
    if (endIndex < lines.length && lines[endIndex].trim() === '') {
      endIndex++;
    }
    return lines.slice(0, endIndex).join('\r\n');
  }

  return '';
}
```

### Save Flow Changes

```typescript
// Before
const serializedBuffer = instance.serializeAddon.serialize({...});
await ipcMainCaller.terminal.saveState({ serializedBuffer, ... });

// After
const rawBuffer = instance.serializeAddon.serialize({...});
const serializedBuffer = stripTrailingEmptyPrompt(rawBuffer);
if (!serializedBuffer) return; // Skip saving empty buffers
await ipcMainCaller.terminal.saveState({ serializedBuffer, ... });
```

### Result

- Restored terminal shows only previous command output
- No duplicate prompts (old + new)
- New PTY spawns with a fresh prompt on a clean line
