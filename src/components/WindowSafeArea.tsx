import { createContext, useContext } from 'react';
import {
  EdgeInsets,
  Rect,
  SafeAreaFrameContext,
  SafeAreaInsetsContext,
  useSafeAreaFrame,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

const WindowMetricsContext = createContext<
  { insets: EdgeInsets; frame: Rect } | undefined
>(undefined);

/**
 * Remembers the window's safe area for `WindowSafeArea`. Goes right inside the
 * root `SafeAreaProvider`, above the split view's columns.
 */
export const WindowSafeAreaProvider: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  const insets = useSafeAreaInsets();
  const frame = useSafeAreaFrame();

  return (
    <WindowMetricsContext.Provider value={{ insets, frame }}>
      {children}
    </WindowMetricsContext.Provider>
  );
};

/**
 * Gives its children the window's safe area instead of the split view
 * column's. A column's insets include the columns beside it (the detail column
 * extends underneath the primary one), which is wrong for a `Modal` opened from
 * a column: it covers the whole window.
 */
const WindowSafeArea: React.FC<React.PropsWithChildren> = ({ children }) => {
  const metrics = useContext(WindowMetricsContext);

  if (!metrics) {
    return children;
  }

  return (
    <SafeAreaInsetsContext.Provider value={metrics.insets}>
      <SafeAreaFrameContext.Provider value={metrics.frame}>
        {children}
      </SafeAreaFrameContext.Provider>
    </SafeAreaInsetsContext.Provider>
  );
};

export default WindowSafeArea;
