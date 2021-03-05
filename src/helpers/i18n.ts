import {getLocales} from 'react-native-localize';
import en from 'assets/translations/en';
import zh from 'assets/translations/zh';

export const getLocale = () => {
  const preferredLocales = getLocales();
  return preferredLocales[0].languageTag;
};

type locale = typeof en | typeof zh;

const translations = (getLocale().startsWith('zh') ? zh : en) as locale;

export function t<K extends keyof locale>(key: K): string {
  return translations[key];
}
