/**
 * Locale definitions and utilities
 */

export const DEFAULT_LOCALE = 'en' as const;

export const locales = ['en', 'zh-CN'] as const;

export type Locales = (typeof locales)[number];

export const normalizeLocale = (locale?: string): Locales => {
  if (!locale) return DEFAULT_LOCALE;

  // Exact match
  for (const l of locales) {
    if (l === locale) return l;
  }

  // Prefix match (e.g., 'zh' -> 'zh-CN', 'en-US' -> 'en')
  if (locale.startsWith('zh')) return 'zh-CN';
  if (locale.startsWith('en')) return 'en';

  return DEFAULT_LOCALE;
};

export function isSupportedLanguage(value: string): value is Locales {
  return locales.includes(value as Locales);
}

type LocaleOption = {
  label: string;
  value: Locales;
};

export const localeOptions: LocaleOption[] = [
  { label: 'English', value: 'en' },
  { label: '简体中文', value: 'zh-CN' },
];
