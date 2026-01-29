import type { StateCreator } from 'zustand';
import type { WorkspaceData } from '../../client/types/entities';
import { getNestedValue, setNestedValue } from '../../lib/utils';
import type {
  HandlerInput,
  HandlerMethod,
  HandlerOutput,
} from '../../nodeBridge.types';

type WorkspaceId = string;

export interface ConfigSliceState {
  // Config state
  globalConfig: Record<string, any> | null;
  isConfigLoading: boolean;
  isConfigSaving: boolean;

  // File and command caches
  filesByWorkspace: Record<WorkspaceId, string[]>;
  slashCommandsByWorkspace: Record<WorkspaceId, any[]>;
}

export interface ConfigSliceActions {
  // Config actions
  loadGlobalConfig: () => Promise<void>;
  getGlobalConfigValue: <T>(key: string, defaultValue?: T) => T | undefined;
  setGlobalConfig: (key: string, value: any) => Promise<boolean>;

  // File and command cache actions
  fetchFileList: (workspaceId: string) => Promise<string[]>;
  fetchSlashCommandList: (workspaceId: string) => Promise<any[]>;
}

export type ConfigSlice = ConfigSliceState & ConfigSliceActions;

// Define the store shape that config slice depends on
interface StoreWithRequest {
  request: <K extends HandlerMethod>(
    method: K,
    params: HandlerInput<K>,
  ) => Promise<HandlerOutput<K>>;
  workspaces: Record<WorkspaceId, WorkspaceData>;
}

type ConfigStore = ConfigSlice & StoreWithRequest;

export const createConfigSlice: StateCreator<
  ConfigStore,
  [],
  [],
  ConfigSlice
> = (set, get) => ({
  // Initial config state
  globalConfig: null,
  isConfigLoading: false,
  isConfigSaving: false,

  // Initial file and command cache state
  filesByWorkspace: {},
  slashCommandsByWorkspace: {},

  loadGlobalConfig: async () => {
    const { globalConfig, isConfigLoading } = get();

    // Skip if already loading or already loaded
    if (isConfigLoading || globalConfig !== null) {
      return;
    }

    set({ isConfigLoading: true });

    try {
      const { request } = get();
      const response = await request('config.list', { cwd: '/tmp' });

      if (response.success && response.data?.config) {
        set({ globalConfig: response.data.config as Record<string, any> });
      } else {
        // Set to empty object if no config exists
        set({ globalConfig: {} });
      }
    } catch (error) {
      console.error('Failed to load global config:', error);
      set({ globalConfig: {} });
    } finally {
      set({ isConfigLoading: false });
    }
  },

  getGlobalConfigValue: <T>(key: string, defaultValue?: T): T | undefined => {
    const { globalConfig } = get();
    return getNestedValue<T>(globalConfig, key, defaultValue);
  },

  setGlobalConfig: async (key: string, value: any): Promise<boolean> => {
    const { globalConfig, isConfigSaving, request } = get();

    if (isConfigSaving) {
      return false;
    }

    // Store previous value for rollback
    const previousConfig = globalConfig ? { ...globalConfig } : null;

    // Optimistic update
    const newConfig = globalConfig
      ? setNestedValue(globalConfig, key, value)
      : setNestedValue({}, key, value);

    set({
      globalConfig: newConfig,
      isConfigSaving: true,
    });

    try {
      const response = await request('config.set', {
        cwd: '/tmp',
        isGlobal: true,
        key,
        value,
      });

      if (!response.success) {
        // Rollback on failure
        set({ globalConfig: previousConfig });
        console.error('Failed to save config:', response);
        return false;
      }

      return true;
    } catch (error) {
      // Rollback on error
      set({ globalConfig: previousConfig });
      console.error('Failed to save config:', error);
      return false;
    } finally {
      set({ isConfigSaving: false });
    }
  },

  fetchFileList: async (workspaceId: string) => {
    const { filesByWorkspace, workspaces, request } = get();

    // Return cached if exists
    if (filesByWorkspace[workspaceId]) {
      return filesByWorkspace[workspaceId];
    }

    const workspace = workspaces[workspaceId];
    if (!workspace) return [];

    try {
      const response = await request('utils.getPaths', {
        cwd: workspace.worktreePath,
      });
      if (response.success) {
        const files = response.data.paths;
        set((state) => ({
          filesByWorkspace: { ...state.filesByWorkspace, [workspaceId]: files },
        }));
        return files;
      }
    } catch (error) {
      console.error('Failed to fetch file list:', error);
    }
    return [];
  },

  fetchSlashCommandList: async (workspaceId: string) => {
    const { slashCommandsByWorkspace, workspaces, request } = get();

    // Return cached if exists
    if (slashCommandsByWorkspace[workspaceId]) {
      return slashCommandsByWorkspace[workspaceId];
    }

    const workspace = workspaces[workspaceId];
    if (!workspace) return [];

    try {
      const response = await request('slashCommand.list', {
        cwd: workspace.worktreePath,
      });
      if (response.success) {
        const commands = response.data.slashCommands.map((cmd: any) => ({
          name: cmd.command.name,
          description: cmd.command.description,
        }));
        set((state) => ({
          slashCommandsByWorkspace: {
            ...state.slashCommandsByWorkspace,
            [workspaceId]: commands,
          },
        }));
        return commands;
      }
    } catch (error) {
      console.error('Failed to fetch slash command list:', error);
    }
    return [];
  },
});
