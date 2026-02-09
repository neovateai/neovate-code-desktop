import type { ComponentType } from 'react';
import type { PluginTab } from '../../components/ContentPanel/types';
import type { RendererApp } from '../app';

// ============================================
// Plugin Config Contribution
// ============================================
export interface PluginConfigContribution {
  activityBarItems?: ActivityBarItemDescriptor[];
  secondarySidebarPanels?: SecondarySidebarPanelDescriptor[];
  contentPanels?: ContentPanelDescriptor[];
  primaryTitlebarItems?: TitlebarItemDescriptor[];
  secondaryTitlebarItems?: TitlebarItemDescriptor[];
}

// ============================================
// Activity Bar
// ============================================
export interface ActivityBarItemDescriptor {
  /** Unique identifier */
  id: string;
  /** Icon component */
  icon: ComponentType<{ className?: string }>;
  /** Tooltip text */
  tooltip?: string;
  /** Order in Activity Bar, lower = closer to top */
  order?: number;
  /** References secondarySidebarPanels[].id */
  secondarySidebarPanelId: string;
}

// ============================================
// Secondary Sidebar
// ============================================
/** Props passed to sidebar panel components */
export interface SidebarPanelProps {
  app: RendererApp;
}

export interface SecondarySidebarPanelDescriptor {
  /** Unique identifier */
  id: string;
  /** Panel title */
  title: string;
  /** Lazy component loader */
  componentLoader: () => Promise<{ default: ComponentType<SidebarPanelProps> }>;
}

// ============================================
// Content Panel
// ============================================
/** Props passed to content panel components */
export interface ContentPanelProps {
  tab: PluginTab;
  app: RendererApp;
}

export interface ContentPanelDescriptor {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Icon component */
  icon: ComponentType<{ className?: string }>;
  /** Lazy component loader */
  componentLoader: () => Promise<{ default: ComponentType<ContentPanelProps> }>;
  /** If true, only one instance allowed */
  singleton?: boolean;
}

// ============================================
// Titlebar
// ============================================
export interface TitlebarItemProps {
  app: RendererApp;
}

export interface TitlebarItemDescriptor {
  /** Unique identifier */
  id: string;
  /** Lazy component loader */
  componentLoader: () => Promise<{ default: ComponentType<TitlebarItemProps> }>;
}
