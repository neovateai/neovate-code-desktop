import type { Plugin, runNeovate } from '@neovate/code';

export type { Plugin as NeovatePlugin };

/**
 * Options passed to runNeovate, derived from @neovate/code
 * Excludes required fields that are set internally (productName, version, argv)
 */
export type NeovateOptions = Partial<
  Omit<Parameters<typeof runNeovate>[0], 'productName' | 'version' | 'argv'>
>;

export interface MainAppOptions {
  neovateOptions?: NeovateOptions;
}
