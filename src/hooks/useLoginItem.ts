import { useEffect, useState } from 'react';
import DeviceInfo from 'constants/DeviceInfo';
import { MenuBar } from 'modules/menubar';
import { recordError } from 'services/crashReporting';

/** Start at login's state, and a way to change it. */
export interface LoginItem {
  enabled: boolean;
  set: (value: boolean) => Promise<void>;
}

/**
 * Open at Login on the Mac: whether macOS opens learnX (in the menu bar,
 * without a window) when the user logs in, and a way to change it. The
 * login item itself is the state, so turning it off in System Settings shows
 * here. Null on iPhone and iPad. The Electron app has its own
 * (useLoginItem.web.ts).
 */
const useLoginItem = (): LoginItem | null => {
  const offered = DeviceInfo.isMac() && MenuBar !== null;
  const [enabled, setEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    if (!offered) {
      return;
    }
    let current = true;
    MenuBar?.getOpenAtLogin().then(
      state => {
        if (current) {
          setEnabled(state === 'on');
        }
      },
      () => {},
    );
    return () => {
      current = false;
    };
  }, [offered]);

  const set = async (value: boolean) => {
    if (enabled === null || value === enabled) {
      return;
    }
    setEnabled(value);
    // What macOS took: one turned off in System Settings stays off until the
    // user allows it there, which this opens.
    try {
      const state = await MenuBar!.setOpenAtLogin(value);
      setEnabled(state === 'on');
    } catch (error) {
      recordError(error, 'Changing Open at Login');
      setEnabled(!value);
    }
  };

  return enabled === null ? null : { enabled, set };
};

export default useLoginItem;
