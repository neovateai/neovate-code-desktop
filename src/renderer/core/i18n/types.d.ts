/**
 * i18n type safety.
 *
 * Core declares I18nResources inside i18next module with the default namespace.
 * Plugins augment I18nResources via `declare module 'i18next'` to add their namespaces.
 * @see src/renderer/plugins/demo/types.d.ts
 */
import 'i18next';
import type en from '../../locales/en-US.json';

declare module 'i18next' {
  interface I18nResources {
    translation: typeof en;
  }

  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: I18nResources;
  }
}
