import { useEffect, useEffectEvent, useRef } from 'react';
import { View, type ViewProps } from 'react-native';
import type { TabBarFrame } from 'modules/toast';

// How long the HUD takes to animate away, as the native view does.
const hideDuration = 200;

// No tab bar showing, unless a test gives one.
let tabBar: TabBarFrame | null = null;
// Whether the HUD says where the tab bar is as it mounts, as the native view
// does once it is in a window.
let answersOnMount = true;
const followers = new Set<(frame: TabBarFrame | null) => void>();

/**
 * Where the tab bar is: sent to the HUDs showing now, as the native view sends
 * it when the tab bar moves, appears or goes, and to those that mount later.
 */
export const setTabBarFrame = (frame: TabBarFrame | null) => {
  tabBar = frame;
  answersOnMount = true;
  followers.forEach(follow => follow(frame));
};

/** Holds back the next HUD's first answer until `setTabBarFrame`. */
export const holdTabBarFrame = () => {
  answersOnMount = false;
};

/** No tab bar, answered on mount: for a test's `afterEach`. */
export const resetTabBarFrame = () => {
  tabBar = null;
  answersOnMount = true;
};

// The toast's UIKit views: plain views. The HUD says where the tab bar is, and
// reports it has gone a moment after it is hidden, once it has shown. They
// are findable as `toast-hud` and `icon-<name>`.
export const ToastHUD = ({
  visible,
  onHidden,
  onTabBarFrame,
  ...props
}: ViewProps & {
  visible: boolean;
  onHidden: () => void;
  onTabBarFrame: (event: { nativeEvent: { frame?: TabBarFrame } }) => void;
}) => {
  const hidden = useEffectEvent(onHidden);
  const shown = useRef(false);
  useEffect(() => {
    if (visible) {
      shown.current = true;
      return;
    }
    if (!shown.current) {
      return;
    }
    const timer = setTimeout(hidden, hideDuration);
    return () => clearTimeout(timer);
  }, [visible]);

  const send = useEffectEvent((frame: TabBarFrame | null) =>
    onTabBarFrame({ nativeEvent: frame ? { frame } : {} }),
  );
  useEffect(() => {
    const follow = (frame: TabBarFrame | null) => send(frame);
    if (answersOnMount) {
      follow(tabBar);
    }
    followers.add(follow);
    return () => {
      followers.delete(follow);
    };
  }, []);

  // `visible` stays on the view, for tests to read.
  return <View testID="toast-hud" {...props} {...{ visible }} />;
};

export const ToastSymbol = ({ name }: { name: string }) => (
  <View testID={`icon-${name}`} />
);
