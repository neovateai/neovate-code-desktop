import type { RendererPlugin } from '../../core';

export const demoI18nPlugin: RendererPlugin = {
  name: 'demo-i18n',
  i18n: {
    namespace: 'plugin.demo',
    loader: async (locale) => {
      try {
        const module = await import(`./locales/${locale}.json`);
        return module.default;
      } catch {
        const fallback = await import('./locales/en.json');
        return fallback.default;
      }
    },
  },
};
