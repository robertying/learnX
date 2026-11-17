import { useEffect, useState } from 'react';
import { isElectron } from 'helpers/platform';

/**
 * Start at login in the Electron app: whether the system will start learnX
 * (in the tray) when the user signs in, and a way to change it. Null where
 * it isn't offered: on the phone, and on Linux. It's off until the user
 * turns it on, and only a change writes it to the system.
 */
/** The bridge's login item (`web/bridge`), required only in the Electron app. */
const loginItem = () =>
  isElectron()
    ? (require('web/bridge') as typeof import('web/bridge')).bridge().loginItem
    : null;

const useLoginItem = () => {
  const [enabled, setEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    const item = loginItem();
    if (!item) {
      return;
    }
    let current = true;
    item.get().then(
      state => {
        if (current && state.supported) {
          setEnabled(state.enabled);
        }
      },
      () => {},
    );
    return () => {
      current = false;
    };
  }, []);

  const set = async (value: boolean) => {
    if (enabled === null || value === enabled) {
      return;
    }
    setEnabled(value);
    // A switch the system didn't take (a dev run never changes it) goes back.
    const changed =
      (await loginItem()
        ?.set(value)
        .catch(() => false)) ?? false;
    if (!changed) {
      setEnabled(!value);
    }
  };

  return enabled === null ? null : { enabled, set };
};

export default useLoginItem;
