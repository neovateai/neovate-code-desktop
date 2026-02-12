import type { Plugin, runNeovate } from '@neovate/code';
import type { AppUpdater } from 'electron-updater';

export type { Plugin as NeovatePlugin };

/**
 * Options passed to runNeovate, derived from @neovate/code
 * Excludes required fields that are set internally (productName, version, argv)
 */
export type NeovateOptions = Partial<
  Omit<Parameters<typeof runNeovate>[0], 'productName' | 'version' | 'argv'>
>;

export type FeedURLOptions = Parameters<AppUpdater['setFeedURL']>[0];

export interface UpdaterOptions {
  feedURL?: FeedURLOptions | (() => Promise<FeedURLOptions>);
}

export interface MainAppOptions {
  neovateOptions?: NeovateOptions;
  updater?: UpdaterOptions;
}
