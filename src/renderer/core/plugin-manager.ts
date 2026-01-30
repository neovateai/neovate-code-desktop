/**
 * Type-safe Plugin Manager for renderer process
 *
 * Plugins are sorted by enforce ordering: pre -> normal -> post
 */

import { defu } from 'defu';

/**
 * Plugin definition: name + enforce + partial hooks +  implementation
 */
export type DefinePlugin<H> = {
  name: string;
  enforce?: 'pre' | 'post';
} & Partial<H>;

/**
 * Extract `this` context type from hook function
 */
type HookContext<H, K extends keyof H> = H[K] extends (
  this: infer C,
  ...args: never[]
) => unknown
  ? C
  : unknown;

/**
 * Extract argument types from hook function (excluding `this`)
 */
type HookArgs<H, K extends keyof H> = H[K] extends (
  this: unknown,
  ...args: infer A
) => unknown
  ? A
  : H[K] extends (...args: infer A) => unknown
    ? A
    : never;

/**
 * Extract return type from hook function (awaited)
 */
type HookReturn<H, K extends keyof H> = H[K] extends (
  ...args: never[]
) => infer R
  ? Awaited<R>
  : never;

/**
 * Extract first argument type from hook function
 */
type FirstArg<H, K extends keyof H> = HookArgs<H, K> extends [
  infer F,
  ...unknown[],
]
  ? F
  : never;

/**
 * Extract rest arguments (excluding first) from hook function
 */
type RestArgs<H, K extends keyof H> = HookArgs<H, K> extends [
  unknown,
  ...infer R,
]
  ? R
  : [];

/**
 * Check if hook is a valid accumulator: first arg type === return type
 */
type IsAccumulator<H, K extends keyof H> = [FirstArg<H, K>] extends [
  HookReturn<H, K>,
]
  ? [HookReturn<H, K>] extends [FirstArg<H, K>]
    ? true
    : false
  : false;

/**
 * Check if hook returns an object type (required for merge)
 */
type IsObjectReturn<H, K extends keyof H> = HookReturn<H, K> extends object
  ? true
  : false;

/**
 * PluginManager - Type-safe plugin lifecycle and hook execution
 */
export class PluginManager<H extends object> {
  readonly #plugins: DefinePlugin<H>[];

  constructor(rawPlugins: DefinePlugin<H>[] = []) {
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
    context: HookContext<H, K>,
    ...args: HookArgs<H, K>
  ): Promise<HookReturn<H, K> | undefined> {
    for (const plugin of this.#plugins) {
      const fn = plugin[hook];
      if (typeof fn === 'function') {
        const result = await fn.call(context, ...args);
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
    context: HookContext<H, K>,
    ...args: HookArgs<H, K>
  ): Promise<void> {
    for (const plugin of this.#plugins) {
      const fn = plugin[hook];
      if (typeof fn === 'function') {
        await fn.call(context, ...args);
      }
    }
  }

  /**
   * Apply hook to all plugins in parallel
   */
  async applyParallel<K extends keyof H>(
    hook: K,
    context: HookContext<H, K>,
    ...args: HookArgs<H, K>
  ): Promise<HookReturn<H, K>[]> {
    const promises = this.#plugins
      .filter((plugin) => typeof plugin[hook] === 'function')
      .map((plugin) => {
        const fn = plugin[hook] as (...a: unknown[]) => unknown;
        return fn.call(context, ...args);
      });

    return Promise.all(promises) as Promise<HookReturn<H, K>[]>;
  }

  /**
   * Apply hook sequentially, passing accumulated result to each plugin.
   * Hook signature must satisfy: (current: T, ...rest) => T (first arg === return type)
   * Each plugin receives the result from the previous plugin.
   */
  async applySeriesLast<K extends keyof H>(
    hook: IsAccumulator<H, K> extends true ? K : never,
    context: HookContext<H, K>,
    initial: FirstArg<H, K>,
    ...rest: RestArgs<H, K>
  ): Promise<HookReturn<H, K>> {
    let result: FirstArg<H, K> = initial;

    for (const plugin of this.#plugins) {
      const fn = plugin[hook as K];
      if (typeof fn === 'function') {
        const newResult = await fn.call(context, result, ...rest);
        if (newResult != null) {
          result = newResult as FirstArg<H, K>;
        }
      }
    }

    return result as HookReturn<H, K>;
  }

  /**
   * Apply hook to all plugins, merging results using defu.
   * Hook must return an object type for merging.
   * Results are merged with earlier plugins taking precedence (defu behavior).
   */
  async applySeriesMerge<K extends keyof H>(
    hook: IsObjectReturn<H, K> extends true ? K : never,
    context: HookContext<H, K>,
    initial: HookReturn<H, K>,
    ...args: HookArgs<H, K>
  ): Promise<HookReturn<H, K>> {
    let result = (initial ?? {}) as HookReturn<H, K>;

    for (const plugin of this.#plugins) {
      const fn = plugin[hook as K];
      if (typeof fn === 'function') {
        const newResult = await fn.call(context, ...args);
        if (newResult != null) {
          result = defu(
            newResult as Record<string, unknown>,
            result as Record<string, unknown>,
          ) as HookReturn<H, K>;
        }
      }
    }

    return result;
  }
}
