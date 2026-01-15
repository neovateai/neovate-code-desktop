type Context = any;

function isFilePath(input: string): boolean {
  // If the string starts with '/' and contains another '/', we consider it a file path.
  // This reliably identifies paths like '/path/to/file' while avoiding
  // misclassifying single-segment commands like '/help' or '/agent.run'.
  return input.startsWith('/') && input.indexOf('/', 1) !== -1;
}

export function isSlashCommand(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed.startsWith('/')) return false;
  if (trimmed === '/') return false;
  if (trimmed.startsWith('/*')) return false;
  const match = trimmed.match(/^\S+/);
  const commandPart = match ? match[0] : '';
  return commandPart !== '' && !isFilePath(commandPart);
}

export function parseSlashCommand(input: string): {
  command: string;
  args: string;
} {
  const trimmed = input.trim();
  const spaceIndex = trimmed.indexOf(' ');
  if (spaceIndex === -1) {
    return {
      command: trimmed.slice(1),
      args: '',
    };
  }
  return {
    command: trimmed.slice(1, spaceIndex),
    args: trimmed.slice(spaceIndex + 1).trim(),
  };
}

export enum CommandSource {
  Builtin = 'builtin',
  User = 'user',
  Project = 'project',
  Plugin = 'plugin',
}

export interface BaseSlashCommand {
  name: string;
  description: string;
  isEnabled?: boolean;
}

export interface LocalCommand extends BaseSlashCommand {
  type: 'local';
  call(args: string, context: Context): Promise<string>;
}

export interface LocalJSXCommand extends BaseSlashCommand {
  type: 'local-jsx';
  call(
    onDone: (result: string | null) => void,
    context: Context,
    args?: string,
  ): Promise<React.ReactNode>;
}

export interface PromptCommand extends BaseSlashCommand {
  type: 'prompt';
  progressMessage?: string;
  model?: string;
  getPromptForCommand(
    args: string,
  ): Promise<Array<{ role: string; content: string }>>;
}

export type SlashCommand = LocalCommand | LocalJSXCommand | PromptCommand;

export interface SlashCommandRegistry {
  register(command: SlashCommand, source?: CommandSource): void;
  unregister(name: string): void;
  get(name: string): SlashCommand | undefined;
  getAll(): SlashCommand[];
  getCommandsBySource(source: CommandSource): SlashCommand[];
  hasCommand(name: string): boolean;
  getMatchingCommands(prefix: string): SlashCommand[];
}

export interface SlashCommandResult {
  type: 'text' | 'jsx';
  content: string | React.ReactNode;
  command: string;
  args: string;
}

export type CommandEntry = {
  command: SlashCommand;
  source: CommandSource;
};
