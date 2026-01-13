// export { useWorkspaceContext } from '../components/WorkspacePanel';
// export { useWorkspaceChangesContext } from '../components/WorkspaceChanges';
// export { useTerminalContext } from '../components/Terminal';
export { useStoreConnection } from './useStoreConnection';

// ChatInput hooks
export { useInputState } from './useInputState';
export { useInputHandlers } from './useInputHandlers';
export { useListNavigation } from './useListNavigation';
export { useDoublePress } from './useDoublePress';
export { useFileSuggestion } from './useFileSuggestion';
export { useSlashCommands, type SlashCommand } from './useSlashCommands';
export { usePasteManager, type PasteResult } from './usePasteManager';
export {
  useImagePasteManager,
  type ImagePasteResult,
} from './useImagePasteManager';
export { useDebounce } from './useDebounce';
