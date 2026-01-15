import type { LocalJSXCommand } from './types';
import { clearCommand } from './clear';
import { resumeCommand } from './resume';

export const localJSXCommands: LocalJSXCommand[] = [
  clearCommand,
  resumeCommand,
];
