import type { ComponentType } from 'react';
import type { DefinePlugin } from '../../shared/lib/plugin-manager';
import type { useStore } from '../store';

/**
 * Renderer plugin hooks interface.
 */
export interface RendererPluginHooks {
  /**
   * Called after store hydration, before React render.
   */
  beforeStart(opts: { store: typeof useStore }): void | Promise<void>;
}

/**
 * Renderer plugin type
 */
export type RendererPlugin<
  H extends RendererPluginHooks = RendererPluginHooks,
> = DefinePlugin<H>;

/**
 * Configuration for a window type
 */
export interface WindowConfig {
  windowId: string;
  render?: () => Promise<{ default: ComponentType }>;
}

/**
 * Options for RendererApp
 */
export interface RendererAppOptions<
  H extends RendererPluginHooks = RendererPluginHooks,
> {
  plugins?: DefinePlugin<H>[];
  windows?: WindowConfig[];
}
