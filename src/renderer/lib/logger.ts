/**
 * Centralized logger utility with log levels and tag support.
 *
 * Usage:
 *   import { logger } from '@/lib/logger';
 *   logger.debug('[STORE]', 'Request:', method, params);
 *   logger.info('[PERSIST]', 'Store hydrated');
 *   logger.warn('[UI]', 'Missing props');
 *   logger.error('[IPC]', 'Connection failed:', error);
 *
 * Control:
 *   logger.setLevel('warn'); // Only show warn + error
 *   logger.setLevel('debug'); // Show all (default in dev)
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Default to 'debug' in development, 'warn' in production
const getDefaultLevel = (): LogLevel => {
  if (
    typeof process !== 'undefined' &&
    process.env?.NODE_ENV === 'production'
  ) {
    return 'warn';
  }
  return 'debug';
};

let currentLevel: LogLevel = getDefaultLevel();

const shouldLog = (level: LogLevel): boolean => {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
};

export const logger = {
  /**
   * Set the minimum log level. Logs below this level will be suppressed.
   */
  setLevel(level: LogLevel): void {
    currentLevel = level;
  },

  /**
   * Get the current log level.
   */
  getLevel(): LogLevel {
    return currentLevel;
  },

  /**
   * Debug level - for detailed debugging info (disabled in production by default)
   */
  debug(...args: unknown[]): void {
    if (shouldLog('debug')) {
      console.log(...args);
    }
  },

  /**
   * Info level - for general information about app flow
   */
  info(...args: unknown[]): void {
    if (shouldLog('info')) {
      console.info(...args);
    }
  },

  /**
   * Warn level - for potential issues that don't break functionality
   */
  warn(...args: unknown[]): void {
    if (shouldLog('warn')) {
      console.warn(...args);
    }
  },

  /**
   * Error level - for errors that affect functionality
   */
  error(...args: unknown[]): void {
    if (shouldLog('error')) {
      console.error(...args);
    }
  },
};
