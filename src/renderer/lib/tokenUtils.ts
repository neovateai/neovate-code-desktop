export interface TokenRange {
  startIndex: number;
  endIndex: number;
  fullMatch: string;
}

/**
 * Find all @-tokens in the string and return the one containing the cursor.
 * Handles both `@path` and `@"path with spaces"` formats.
 */
export function findAtTokenAtCursor(
  value: string,
  cursorPosition: number,
): TokenRange | null {
  const pattern = /(?:^|\s)(@(?:"[^"]*"?|[^\s]*))/g;

  const allMatches: Array<{
    fullMatch: string;
    startIndex: number;
    endIndex: number;
  }> = [];

  let match = pattern.exec(value);
  while (match !== null) {
    const fullMatch = match[1];
    const startIndex = match.index + (match[0].length - fullMatch.length);
    const endIndex = startIndex + fullMatch.length;
    allMatches.push({ fullMatch, startIndex, endIndex });

    if (cursorPosition >= startIndex && cursorPosition <= endIndex) {
      return { startIndex, endIndex, fullMatch };
    }

    match = pattern.exec(value);
  }

  return null;
}

/**
 * Check if cursor is in the command portion of a slash command.
 * Only valid when value starts with '/'.
 */
export function isCursorInSlashCommand(
  value: string,
  cursorPosition: number,
): boolean {
  if (!value.startsWith('/')) return false;

  const firstSpace = value.indexOf(' ');
  const commandEndPos = firstSpace === -1 ? value.length : firstSpace;

  return cursorPosition <= commandEndPos;
}
