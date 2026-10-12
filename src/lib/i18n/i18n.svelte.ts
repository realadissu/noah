//! Lightweight, zero-dependency reactive i18n system for NOAH.

import en from './en.json';
import de from './de.json';

export type SupportedLocale = 'en' | 'de';

type Dictionary = typeof en;

const dictionaries: Record<SupportedLocale, Dictionary> = {
  en,
  de,
};

class I18nManager {
  locale = $state<SupportedLocale>('en');

  setLocale(newLocale: SupportedLocale) {
    this.locale = newLocale;
    if (typeof document !== 'undefined') {
      document.documentElement.lang = newLocale;
    }
  }

  t(path: string, params?: Record<string, string | number>): string {
    const dict = dictionaries[this.locale] || dictionaries.en;
    const segments = path.split('.');
    
    let current: unknown = dict;
    for (const segment of segments) {
      if (current && typeof current === 'object' && segment in current) {
        current = (current as Record<string, unknown>)[segment];
      } else {
        // Fallback to English if missing in German
        let fallback: unknown = dictionaries.en;
        for (const fbSegment of segments) {
          if (fallback && typeof fallback === 'object' && fbSegment in fallback) {
            fallback = (fallback as Record<string, unknown>)[fbSegment];
          } else {
            return path;
          }
        }
        current = fallback;
        break;
      }
    }

    if (typeof current !== 'string') {
      return path;
    }

    let output = current;
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        output = output.replaceAll(`{${key}}`, String(value));
      }
    }

    return output;
  }
}

export const i18n = new I18nManager();
export const t = (path: string, params?: Record<string, string | number>) => i18n.t(path, params);
