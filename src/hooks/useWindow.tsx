import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  type PropsWithChildren,
} from 'react';
import { useIsFocused } from '@react-navigation/native';
import { getTargetUrl, type OpenTarget } from 'helpers/openTarget';
import {
  registerWindow,
  setWindowLink,
  usePrimaryWindow,
} from 'services/windows';

/** What the native side hands each window's root (`SceneDelegate.swift`). */
export interface WindowProps {
  /** The window's id: its scene session's. Missing with one window only. */
  windowId?: string;
  /** The learnx:// link the window opened with, if any. */
  initialURL?: string;
}

const WindowContext = createContext<WindowProps>({});

/** Gives the app inside it its window (`services/windows`). */
export const WindowProvider: React.FC<PropsWithChildren<WindowProps>> = ({
  windowId,
  initialURL,
  children,
}) => {
  useLayoutEffect(
    () => (windowId ? registerWindow(windowId) : undefined),
    [windowId],
  );
  const value = useMemo(
    () => ({ windowId, initialURL }),
    [windowId, initialURL],
  );
  return (
    <WindowContext.Provider value={value}>{children}</WindowContext.Provider>
  );
};

/** The window this root draws in, and the link it opened with. */
export const useWindow = () => useContext(WindowContext);

/**
 * Whether this window does the app-wide work (`services/windows`): always
 * with one window; with several, the oldest.
 */
export const useIsPrimaryWindow = () => {
  const { windowId } = useWindow();
  const primary = usePrimaryWindow();
  return windowId === undefined || primary === windowId;
};

/**
 * Remembers what this window shows while the calling screen is focused, so
 * that it reopens there after a relaunch (iPad and Mac).
 */
export const useWindowRestoration = (target: OpenTarget) => {
  const { windowId } = useWindow();
  const focused = useIsFocused();
  const link = getTargetUrl(target);
  useEffect(() => {
    if (windowId && focused) {
      setWindowLink(windowId, link);
    }
  }, [windowId, focused, link]);
};
