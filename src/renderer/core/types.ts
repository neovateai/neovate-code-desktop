import type { ComponentType } from 'react';
import type { useStore } from '../store';
import type { RendererApp } from './app';
import type { LazyNamespaceConfig } from './i18n';
import type { PluginConfigContribution } from './plugin';
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
   * Return i18n config to register lazy-loaded translations.
   * Return void to skip registration.
   */
  configI18n(): LazyNamespaceConfig | void;

  /**
   * Return UI contributions (activity bar items, sidebar panels, content panels).
   * Return empty object {} to skip contribution.
   */
  configContributes(this: PluginContext): PluginConfigContribution;

  /**
   * Called after store hydration, before React render.
   */
  beforeRender(
    this: PluginContext,
    options: { store: typeof useStore },
  ): void | Promise<void>;
}

/**
 * Renderer plugin config interface
 */
export interface RendererPluginConfig {
  // Reserved for future static config properties
}

/**
 * Renderer plugin type
 */
export type RendererPlugin = DefinePlugin<
  RendererPluginHooks,
  RendererPluginConfig
>;

/**
 * Configuration for a window type
 */
export interface WindowConfig {
  windowType: string;
  componentLoader: () => Promise<{ default: ComponentType }>;
}
