import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Get a nested value from an object using dot-notation path.
 * @example getNestedValue({ a: { b: 1 } }, 'a.b') // returns 1
 */
export function getNestedValue<T>(
  obj: Record<string, any> | null | undefined,
  path: string,
  defaultValue?: T,
): T | undefined {
  if (!obj) return defaultValue;

  const keys = path.split('.');
  let current: any = obj;

  for (const key of keys) {
    if (
      current === null ||
      current === undefined ||
      typeof current !== 'object'
    ) {
      return defaultValue;
    }
    current = current[key];
  }

  return current === undefined ? defaultValue : current;
}

/**
 * Set a nested value in an object using dot-notation path.
 * Returns a new object with the value set (does not mutate original).
 * @example setNestedValue({ a: { b: 1 } }, 'a.c', 2) // returns { a: { b: 1, c: 2 } }
 */
export function setNestedValue(
  obj: Record<string, any>,
  path: string,
  value: any,
): Record<string, any> {
  const result = JSON.parse(JSON.stringify(obj)); // Deep clone
  const keys = path.split('.');
  let current = result;

  for (let i = 0; i < keys.length - 1; i++) {
    current[keys[i]] = current[keys[i]] ?? {};
    current = current[keys[i]];
  }

  current[keys[keys.length - 1]] = value;
  return result;
}

/**
 * Generate a unique tab ID.
 */
export function generateTabId(): string {
  return `tab-${crypto.randomUUID().slice(0, 8)}`;
}
