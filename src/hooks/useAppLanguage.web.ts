import { useEffect, useState } from 'react';
import { bridge } from 'web/bridge';
import type { AppLanguage } from 'web/bridgeTypes';
import type { AppLanguageSetting } from './useAppLanguage';

/**
 * The Electron app's own language, on Windows and Linux, which have no
 * per-app language (electron/language.ts): what's chosen, saved in the main
 * process for the next launch. Null where it isn't offered.
 */
const useAppLanguage = (): AppLanguageSetting | null => {
  const [language, setLanguage] = useState<AppLanguage | null>(null);

  useEffect(() => {
    let current = true;
    bridge()
      .language.get()
      .then(
        state => {
          if (current && state.supported) {
            setLanguage(state.language);
          }
        },
        () => {},
      );
    return () => {
      current = false;
    };
  }, []);

  const set = async (value: AppLanguage) => {
    const saved = await bridge()
      .language.set(value)
      .catch(() => false);
    if (saved) {
      setLanguage(value);
    }
    return saved;
  };

  return language === null
    ? null
    : { language, set, relaunch: () => bridge().relaunch() };
};

export default useAppLanguage;
