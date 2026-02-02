/**
 * i18n type safety for default namespace.
 *
 * Plugins can add their own namespaces by creating a types.d.ts:
 * @see src/renderer/plugins/demo-i18n/types.d.ts
 */
import 'i18next';
import type en from '../../locales/en.json';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: {
      translation: typeof en;
    };
  }
}
