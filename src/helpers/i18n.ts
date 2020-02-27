import {getLocales} from 'react-native-localize';
import en from '../assets/translations/en';
import zh from '../assets/translations/zh';

export const getLocale = () => {
  const preferredLocales = getLocales();
  return preferredLocales[0].languageTag;
};

const translations = (getLocale().startsWith('zh') ? zh : en) as typeof en;

export function getTranslation<K extends keyof typeof en>(key: K): string {
  return translations[key];
}
