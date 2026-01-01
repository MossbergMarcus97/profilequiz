export const locales = ['en', 'sv', 'no', 'da', 'fi', 'is', 'de', 'es', 'fr'] as const;
export type Locale = (typeof locales)[number];

export const localeNames: Record<Locale, string> = {
  en: 'English',
  sv: 'Svenska',
  no: 'Norsk',
  da: 'Dansk',
  fi: 'Suomi',
  is: 'Íslenska',
  de: 'Deutsch',
  es: 'Español',
  fr: 'Français',
};

export const localeFlags: Record<Locale, string> = {
  en: '🇬🇧',
  sv: '🇸🇪',
  no: '🇳🇴',
  da: '🇩🇰',
  fi: '🇫🇮',
  is: '🇮🇸',
  de: '🇩🇪',
  es: '🇪🇸',
  fr: '🇫🇷',
};

export const defaultLocale: Locale = 'en';

