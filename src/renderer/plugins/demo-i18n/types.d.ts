/**
 * Plugin i18n type safety example.
 *
 * To make your plugin's translation keys type-safe:
 * 1. Import your locale JSON file as a type
 * 2. Extend i18next's CustomTypeOptions to add your namespace
 *
 * Usage in components:
 * ```tsx
 * import { useTranslation } from 'react-i18next';
 *
 * const { t } = useTranslation('plugin.demo');
 * t('demo.message');  // ✅ Type-safe, with autocomplete
 * t('invalid.key');   // ❌ TypeScript error
 * ```
 */
import 'i18next';
import type en from './locales/en.json';

declare module 'i18next' {
  interface CustomTypeOptions {
    resources: {
      'plugin.demo': typeof en;
    };
  }
}
