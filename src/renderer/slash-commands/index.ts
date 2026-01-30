import { clearCommand } from './clear';
import { loginCommand } from './login';
import { resumeCommand } from './resume';
import type { LocalJSXCommand } from './types';

export const localJSXCommands: LocalJSXCommand[] = [
  clearCommand,
  resumeCommand,
  loginCommand,
];
