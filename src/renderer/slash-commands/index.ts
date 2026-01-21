import type { LocalJSXCommand } from './types';
import { clearCommand } from './clear';
import { resumeCommand } from './resume';
import { loginCommand } from './login';

export const localJSXCommands: LocalJSXCommand[] = [
  clearCommand,
  resumeCommand,
  loginCommand,
];
