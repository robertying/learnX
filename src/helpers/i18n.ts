import DeviceInfo from "react-native-device-info";
import en from "../assets/translations/en";
import zh from "../assets/translations/zh";
import { store } from "../redux/store";
import { Language } from "../redux/types/state";

export const getLocale = () => {
  const lang = store.getState().settings.lang;
  const preferredLocales = DeviceInfo.getPreferredLocales();
  if (lang) {
    return Language[lang];
  } else {
    return preferredLocales[0];
  }
};

const translations = (getLocale().startsWith("zh") ? zh : en) as typeof en;

export function getTranslation<K extends keyof (typeof en)>(key: K): string {
  return translations[key];
}
