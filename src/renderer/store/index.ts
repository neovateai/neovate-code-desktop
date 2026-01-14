// Re-export existing store for backwards compatibility
export {
  useStore,
  getInputMode,
  defaultSessionInputState,
  type InputMode,
  type PlanMode,
  type ThinkingLevel,
  type Store,
  type StoreState,
  type StoreActions,
  type SessionProcessingState,
} from '../store';
export type { SessionInputState } from '../store';
