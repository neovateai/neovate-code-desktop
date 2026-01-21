// Updater type definitions for typesafe IPC communication
// UI State - represents all possible states of the updater toast
export type UpdaterState =
  | { status: 'idle' }
  | { status: 'checking' } // Set by renderer when calling check()
  | { status: 'up-to-date' }
  | { status: 'available'; version: string } // Found update, not downloaded
  | { status: 'downloading'; version: string; percent: number }
  | { status: 'ready'; version: string } // Downloaded, ready to install
  | { status: 'error'; message: string };

// Define simple interface (input/output only)
export interface IUpdaterIpcMethods {
  getState(): UpdaterState;
  check(): void;
  dismiss(): void;
  download(): void;
  install(): void;
}
