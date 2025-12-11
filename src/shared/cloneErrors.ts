/**
 * Git clone error codes
 * Provides structured error handling for clone operations
 */
export enum CloneErrorCode {
  /** User cancelled the operation */
  CANCELLED = 'CANCELLED',

  /** SSH authentication failed */
  SSH_AUTH_FAILED = 'SSH_AUTH_FAILED',

  /** HTTPS authentication required */
  AUTH_REQUIRED = 'AUTH_REQUIRED',

  /** Network connectivity issues */
  NETWORK_ERROR = 'NETWORK_ERROR',

  /** Repository not found or access denied */
  REPO_NOT_FOUND = 'REPO_NOT_FOUND',

  /** Clone operation timed out */
  TIMEOUT = 'TIMEOUT',

  /** Git is not installed */
  GIT_NOT_INSTALLED = 'GIT_NOT_INSTALLED',

  /** Invalid URL format */
  INVALID_URL = 'INVALID_URL',

  /** Directory already exists */
  DIR_EXISTS = 'DIR_EXISTS',

  /** Unknown error */
  UNKNOWN = 'UNKNOWN',
}

/**
 * User-friendly error messages for each error code
 */
export const CloneErrorMessages: Record<CloneErrorCode, string> = {
  [CloneErrorCode.CANCELLED]: 'Clone operation cancelled by user',
  [CloneErrorCode.SSH_AUTH_FAILED]:
    'SSH authentication failed. Please ensure your SSH keys are properly configured.',
  [CloneErrorCode.AUTH_REQUIRED]:
    'Authentication required. This is a private repository.\nPlease use SSH URL with configured SSH keys, or use "git clone" in terminal to enter credentials.',
  [CloneErrorCode.NETWORK_ERROR]:
    'Network error. Please check your internet connection and try again.',
  [CloneErrorCode.REPO_NOT_FOUND]:
    'Repository not found or access denied. Please check the URL and your permissions.',
  [CloneErrorCode.TIMEOUT]:
    'Clone operation timed out. The repository might be too large or the connection is slow.\nPlease try again.',
  [CloneErrorCode.GIT_NOT_INSTALLED]:
    'Git is not installed. Please install Git from https://git-scm.com/',
  [CloneErrorCode.INVALID_URL]:
    'Invalid Git repository URL. Please use HTTPS or SSH format.',
  [CloneErrorCode.DIR_EXISTS]:
    'Directory already exists at destination. Please choose a different location or remove the existing directory.',
  [CloneErrorCode.UNKNOWN]:
    'Failed to clone repository. Please check the URL and try again.',
};

/**
 * Get user-friendly error message for error code
 */
export function getCloneErrorMessage(
  errorCode: CloneErrorCode,
  customMessage?: string,
): string {
  return customMessage || CloneErrorMessages[errorCode];
}

/**
 * Determine error code from error message
 */
export function detectCloneErrorCode(errorMessage: string): CloneErrorCode {
  const msg = errorMessage.toLowerCase();

  if (msg.includes('cancelled by user')) {
    return CloneErrorCode.CANCELLED;
  }

  if (
    msg.includes('host key verification failed') ||
    msg.includes('permission denied (publickey)')
  ) {
    return CloneErrorCode.SSH_AUTH_FAILED;
  }

  if (
    msg.includes('authentication failed') ||
    msg.includes('could not read username') ||
    msg.includes('could not read password')
  ) {
    return CloneErrorCode.AUTH_REQUIRED;
  }

  if (
    msg.includes('could not resolve hostname') ||
    msg.includes('network') ||
    msg.includes('connection')
  ) {
    return CloneErrorCode.NETWORK_ERROR;
  }

  if (msg.includes('not found') || msg.includes('404')) {
    return CloneErrorCode.REPO_NOT_FOUND;
  }

  if (msg.includes('timed out') || msg.includes('timeout')) {
    return CloneErrorCode.TIMEOUT;
  }

  if (
    msg.includes('git is not installed') ||
    msg.includes('git: command not found')
  ) {
    return CloneErrorCode.GIT_NOT_INSTALLED;
  }

  if (msg.includes('invalid') && msg.includes('url')) {
    return CloneErrorCode.INVALID_URL;
  }

  if (msg.includes('already exists')) {
    return CloneErrorCode.DIR_EXISTS;
  }

  return CloneErrorCode.UNKNOWN;
}
