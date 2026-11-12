let current = 'en-US';
let hour24 = true;

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

/**
 * Whether the expo-localization mock reports a 24-hour clock; tests may change
 * it, and helpers/i18n then reads it again.
 */
export const mockClock = {
  get uses24hourClock() {
    return hour24;
  },
  set uses24hourClock(value: boolean) {
    hour24 = value;
    require('../src/helpers/i18n').resetLocale();
  },
};
