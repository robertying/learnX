import {getLocales} from 'react-native-localize';
import en from '../assets/translations/en';
import zh from '../assets/translations/zh';
import {store} from '../redux/store';
import {Language} from '../redux/types/state';

export const getLocale = () => {
  const lang = store.getState().settings.lang;
  const preferredLocales = getLocales();
  if (lang) {
    return Language[lang];
  } else {
    return preferredLocales[0].languageTag;
  }
};

const translations = (getLocale().startsWith('zh') ? zh : en) as typeof en;

export function getTranslation<K extends keyof typeof en>(key: K): string {
  return translations[key];
}
