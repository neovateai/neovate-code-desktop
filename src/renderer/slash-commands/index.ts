import type { LocalJSXCommand } from '../slashCommand';
import { clearCommand } from './clear';
import { resumeCommand } from './resume';

export const localJSXCommands: LocalJSXCommand[] = [
  clearCommand,
  resumeCommand,
];
