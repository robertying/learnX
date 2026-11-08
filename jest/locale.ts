let current = 'en-US';

/**
 * Locale reported by the expo-localization mock; tests may change it, and
 * helpers/i18n then reads it again.
 */
export const mockLocale = {
  get current() {
    return current;
  },
  set current(value: string) {
    current = value;
    require('../src/helpers/i18n').resetLocale();
  },
};
