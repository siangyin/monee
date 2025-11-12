// i18n.ts
export const locales = ['en', 'zh'] as const;
export const languageNames: Record<Locale, string> = {
  en: 'English',
  zh: '中文',
}
export type Locale = typeof locales[number];
export const defaultLocale: Locale = 'en';
