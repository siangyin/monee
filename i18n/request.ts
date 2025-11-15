// i18n/request.ts
import { getRequestConfig } from 'next-intl/server';
import { locales, defaultLocale, type Locale } from '@/i18n';

export default getRequestConfig(async ({ locale }) => {
  // Guard unknown locales
  const active = (locales as readonly string[]).includes(locale!) ? (locale as Locale) : defaultLocale;

  // Load messages for the active locale
  const messages = (await import(`@/messages/${active}.json`)).default;

  return {
    locale: active,
    messages
  };
});
