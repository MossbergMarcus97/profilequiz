import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';
import { locales, defaultLocale, Locale } from './config';

export default getRequestConfig(async () => {
  // Try to get locale from cookie first (unique name to avoid localhost conflicts)
  const cookieStore = cookies();
  const localeCookie = cookieStore.get('profilequiz_locale')?.value as Locale | undefined;
  
  // Then try Accept-Language header
  const headerStore = headers();
  const acceptLanguage = headerStore.get('accept-language');
  
  let locale: Locale = defaultLocale;
  
  if (localeCookie && locales.includes(localeCookie)) {
    locale = localeCookie;
  } else if (acceptLanguage) {
    // Parse Accept-Language header
    const preferredLocale = acceptLanguage
      .split(',')
      .map(lang => lang.split(';')[0].trim().substring(0, 2))
      .find(lang => locales.includes(lang as Locale)) as Locale | undefined;
    
    if (preferredLocale) {
      locale = preferredLocale;
    }
  }

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default
  };
});

