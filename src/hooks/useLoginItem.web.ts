import { useEffect, useState } from 'react';
import { bridge } from 'web/bridge';
import type { LoginItem } from './useLoginItem';

/**
 * Start at login in the Electron app: whether the system will start learnX
 * (in the tray) when the user signs in, and a way to change it. Null where
 * it isn't offered (Linux). It's off until the user turns it on, and only a
 * change writes it to the system. The phones have none (useLoginItem.ts).
 */
const useLoginItem = (): LoginItem | null => {
  const [enabled, setEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    let current = true;
    bridge()
      .loginItem.get()
      .then(
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
    const changed = await bridge()
      .loginItem.set(value)
      .catch(() => false);
    if (!changed) {
      setEnabled(!value);
    }
  };

  return enabled === null ? null : { enabled, set };
};

export default useLoginItem;
