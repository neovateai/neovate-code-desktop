import type { ErrorCode } from './constants';

// Re-export Plugin type from @neovate/code for use across the app
export type { Plugin as NeovatePlugin } from '@neovate/code';

export interface ServerReadyPayload {
  url: string;
}

export interface ServerErrorPayload {
  code: ErrorCode;
  message: string;
}

export interface ServerInstance {
  url: string;
  close: () => void;
}
