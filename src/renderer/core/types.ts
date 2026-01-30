import type { ComponentType } from 'react';
import type { DefinePlugin } from './plugin-manager';
import type { useStore } from '../store';
import type { RendererApp } from './app';
import type { LazyNamespaceConfig } from './i18n';

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
 * Plugin i18n configuration for lazy-loaded namespaces.
 * Uses LazyNamespaceConfig from core i18n module.
 */
export type RendererPluginI18nConfig = LazyNamespaceConfig;

/**
 * Renderer plugin type
 */
export type RendererPlugin = DefinePlugin<RendererPluginHooks> & {
  i18n?: RendererPluginI18nConfig;
};

/**
 * Configuration for a window type
 */
export interface WindowConfig {
  windowId: string;
  componentLoader: () => Promise<{ default: ComponentType }>;
}
