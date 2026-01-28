import { defu } from 'defu';

/**
 * Plugin definition type with optional enforcement ordering
 */
export interface DefinePlugin<H> {
  name: string;
  enforce?: 'pre' | 'post';
  [K: string]: unknown;
}

/**
 * Hook return type helper
 */
type HookReturn<H, K extends keyof H> = H[K] extends (...args: any[]) => infer R
  ? Awaited<R>
  : never;

/**
 * Options for hook application
 */
interface ApplyOptions<H, K extends keyof H> {
  args: unknown[];
  memo?: HookReturn<H, K>;
}

/**
 * PluginManager - Manages plugin lifecycle and hook execution
 *
 * Plugins are sorted by enforce ordering: pre -> normal -> post
 */
export class PluginManager<H> {
  #plugins: DefinePlugin<H>[] = [];

  constructor(rawPlugins: DefinePlugin<H>[]) {
    // Sort plugins by enforce: pre -> normal -> post
    this.#plugins = [
      ...rawPlugins.filter((p) => p.enforce === 'pre'),
      ...rawPlugins.filter((p) => !p.enforce),
      ...rawPlugins.filter((p) => p.enforce === 'post'),
    ];
  }

  /**
   * Get all registered plugins
   */
  getPlugins(): readonly DefinePlugin<H>[] {
    return this.#plugins;
  }

  /**
   * Apply hook to get first non-null/undefined result
   */
  async applyFirst<K extends keyof H>(
    hook: K,
    context: unknown,
    options: ApplyOptions<H, K>,
  ): Promise<HookReturn<H, K> | undefined> {
    for (const plugin of this.#plugins) {
      const fn = plugin[hook as string];
      if (typeof fn === 'function') {
        const result = await fn.call(context, ...options.args);
        if (result != null) {
          return result as HookReturn<H, K>;
        }
      }
    }
    return undefined;
  }

  /**
   * Apply hook sequentially to all plugins
   */
  async applySeries<K extends keyof H>(
    hook: K,
    context: unknown,
    options: ApplyOptions<H, K>,
  ): Promise<void> {
    for (const plugin of this.#plugins) {
      const fn = plugin[hook as string];
      if (typeof fn === 'function') {
        await fn.call(context, ...options.args);
      }
    }
  }

  /**
   * Apply hook to all plugins in parallel
   */
  async applyParallel<K extends keyof H>(
    hook: K,
    context: unknown,
    options: ApplyOptions<H, K>,
  ): Promise<HookReturn<H, K>[]> {
    const promises = this.#plugins
      .filter((plugin) => typeof plugin[hook as string] === 'function')
      .map((plugin) => {
        const fn = plugin[hook as string] as (...args: unknown[]) => unknown;
        return fn.call(context, ...options.args);
      });

    const results = await Promise.all(promises);
    return results as HookReturn<H, K>[];
  }

  /**
   * Apply hook sequentially, chaining results (last result wins)
   */
  async applySeriesLast<K extends keyof H>(
    hook: K,
    context: unknown,
    options: ApplyOptions<H, K>,
  ): Promise<HookReturn<H, K>> {
    let result = options.memo;

    for (const plugin of this.#plugins) {
      const fn = plugin[hook as string];
      if (typeof fn === 'function') {
        const newResult = await fn.call(context, result, ...options.args);
        if (newResult != null) {
          result = newResult;
        }
      }
    }

    return result as HookReturn<H, K>;
  }

  /**
   * Apply hook sequentially, merging results using defu
   */
  async applySeriesMerge<K extends keyof H>(
    hook: K,
    context: unknown,
    options: ApplyOptions<H, K>,
  ): Promise<HookReturn<H, K>> {
    let result = (options.memo ?? {}) as Record<string, unknown>;

    for (const plugin of this.#plugins) {
      const fn = plugin[hook as string];
      if (typeof fn === 'function') {
        const newResult = await fn.call(context, ...options.args);
        if (newResult != null) {
          result = defu(newResult as Record<string, unknown>, result);
        }
      }
    }

    return result as HookReturn<H, K>;
  }
}
