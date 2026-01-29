import type { ComponentType } from 'react';
import type { useStore } from '../store';
import type { RendererApp } from './app';
import type { DefinePlugin } from './plugin-manager';

/**
 * Plugin execution context with app instance
 */
export interface PluginContext {
  app: RendererApp;
}

/**
 * Renderer plugin hooks interface.
 */
export interface RendererPluginHooks {
  /**
   * Called after store hydration, before React render.
   */
  beforeRender(
    this: PluginContext,
    options: { store: typeof useStore },
  ): void | Promise<void>;
}

/**
 * Renderer plugin type
 */
export type RendererPlugin = DefinePlugin<RendererPluginHooks>;

/**
 * Configuration for a window type
 */
export interface WindowConfig {
  windowId: string;
  componentLoader: () => Promise<{ default: ComponentType }>;
}
