import { Locale } from "@/i18n/config";
import { TranslatedBlueprint, mergeTranslation } from "./gemini";

interface TranslationsMap {
  [locale: string]: TranslatedBlueprint;
}

/**
 * Parse translations JSON from database
 */
export function parseTranslations(translationsJson: string | null): TranslationsMap {
  if (!translationsJson) return {};
  try {
    return JSON.parse(translationsJson);
  } catch {
    return {};
  }
}

/**
 * Get translated blueprint for a specific locale
 * Falls back to English if translation doesn't exist
 */
export function getTranslatedBlueprint(
  blueprint: any,
  translationsJson: string | null,
  locale: Locale
): any {
  if (locale === "en") {
    return blueprint;
  }

  const translations = parseTranslations(translationsJson);
  const translation = translations[locale];

  if (!translation) {
    return blueprint;
  }

  return mergeTranslation(blueprint, translation);
}

/**
 * Get translated profile data for a specific locale
 */
export function getTranslatedProfile(
  profile: {
    name: string;
    oneLineHook: string;
    teaserBullets: string[];
    shareTitle?: string | null;
  },
  translationsJson: string | null,
  profileId: string,
  locale: Locale
): {
  name: string;
  oneLineHook: string;
  teaserBullets: string[];
  shareTitle?: string;
} {
  if (locale === "en") {
    return {
      name: profile.name,
      oneLineHook: profile.oneLineHook,
      teaserBullets: profile.teaserBullets,
      shareTitle: profile.shareTitle || undefined,
    };
  }

  const translations = parseTranslations(translationsJson);
  const translation = translations[locale];

  if (!translation || !translation.profiles) {
    return {
      name: profile.name,
      oneLineHook: profile.oneLineHook,
      teaserBullets: profile.teaserBullets,
      shareTitle: profile.shareTitle || undefined,
    };
  }

  const translatedProfile = translation.profiles.find((p) => p.id === profileId);

  if (!translatedProfile) {
    return {
      name: profile.name,
      oneLineHook: profile.oneLineHook,
      teaserBullets: profile.teaserBullets,
      shareTitle: profile.shareTitle || undefined,
    };
  }

  return {
    name: translatedProfile.name,
    oneLineHook: translatedProfile.oneLineHook,
    teaserBullets: translatedProfile.teaserBullets,
    shareTitle: translatedProfile.shareTitle || profile.shareTitle || undefined,
  };
}

/**
 * Get available translations for a test
 */
export function getAvailableTranslations(translationsJson: string | null): Locale[] {
  const translations = parseTranslations(translationsJson);
  return Object.keys(translations) as Locale[];
}

