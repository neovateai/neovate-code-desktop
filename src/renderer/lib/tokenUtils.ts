import { encode } from 'gpt-tokenizer';

export interface TokenRange {
  startIndex: number;
  endIndex: number;
  fullMatch: string;
}

/**
 * Count tokens in a text string using gpt-tokenizer
 * Falls back to simple estimation if encoding fails
 *
 * @param text - The text to count tokens for
 * @returns The number of tokens
 */
export function countTokens(text: string): number {
  if (!text) return 0;
  try {
    return encode(text).length;
  } catch (error) {
    console.warn('Failed to encode text with gpt-tokenizer:', error);
    // Fallback to simple estimation if encoding fails
    return Math.ceil(text.length / 4);
  }
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
  let match;

  // console.log(
  //   '[findAtTokenAtCursor] value:',
  //   JSON.stringify(value),
  //   'cursorPosition:',
  //   cursorPosition,
  // );

  const allMatches: Array<{
    fullMatch: string;
    startIndex: number;
    endIndex: number;
  }> = [];

  while ((match = pattern.exec(value)) !== null) {
    const fullMatch = match[1];
    const startIndex = match.index + (match[0].length - fullMatch.length);
    const endIndex = startIndex + fullMatch.length;
    allMatches.push({ fullMatch, startIndex, endIndex });

    // console.log('[findAtTokenAtCursor] found match:', {
    //   fullMatch,
    //   startIndex,
    //   endIndex,
    //   cursorInRange: cursorPosition >= startIndex && cursorPosition <= endIndex,
    // });

    if (cursorPosition >= startIndex && cursorPosition <= endIndex) {
      // console.log('[findAtTokenAtCursor] returning match:', {
      //   startIndex,
      //   endIndex,
      //   fullMatch,
      // });
      return { startIndex, endIndex, fullMatch };
    }
  }

  // console.log('[findAtTokenAtCursor] no match found, all matches:', allMatches);
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
