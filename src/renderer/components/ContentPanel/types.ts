// Content Panel Tab Types
// Discriminated union for different panel types

// Base interface all tabs share
interface BaseTab {
  id: string;
  name: string;
}

// Terminal-specific tab
export interface TerminalTab extends BaseTab {
  type: 'terminal';
  ptyId: string | null;
}

// Editor tab (future)
export interface EditorTab extends BaseTab {
  type: 'editor';
  filePath: string;
  isDirty: boolean;
}

// Review tab (future)
export interface ReviewTab extends BaseTab {
  type: 'review';
  reviewId: string;
  title: string;
}

// Browser tab (placeholder)
export interface BrowserTab extends BaseTab {
  type: 'browser';
}

// Plugin-contributed panel tab
export interface PluginTab extends BaseTab {
  type: 'plugin';
  /** References ContentPanelDescriptor.id */
  panelId: string;
  /** Props passed to the panel component */
  props?: Record<string, unknown>;
}

// Discriminated union - extend as needed
export type ContentTab =
  | TerminalTab
  | EditorTab
  | ReviewTab
  | BrowserTab
  | PluginTab;

// Tab type literal union for type guards
export type ContentTabType = ContentTab['type'];

// Helper to create type-specific tabs
export type TabOfType<T extends ContentTabType> = Extract<
  ContentTab,
  { type: T }
>;

// Serializable version for persistence (same as ContentTab for now)
// If runtime-only fields are added to tabs, exclude them here
export type SerializableTab = ContentTab;

// Tab creation input (without id, which is generated)
export type CreateTabInput =
  | Omit<TerminalTab, 'id'>
  | Omit<EditorTab, 'id'>
  | Omit<ReviewTab, 'id'>
  | Omit<BrowserTab, 'id'>
  | Omit<PluginTab, 'id'>;

// Available tab types for the add menu
export const TAB_TYPE_OPTIONS: readonly {
  type: ContentTabType;
  label: string;
}[] = [
  { type: 'terminal', label: 'Terminal' },
  { type: 'editor', label: 'Editor' },
  { type: 'review', label: 'Review' },
  { type: 'browser', label: 'Browser' },
] as const;

// Singleton tab types - only one instance allowed
export const SINGLETON_TAB_TYPES: readonly ContentTabType[] = [
  'editor',
  'review',
  'browser',
];
