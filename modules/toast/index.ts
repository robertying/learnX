import { requireNativeView } from 'expo';
import type { ColorValue, NativeSyntheticEvent, ViewProps } from 'react-native';

/** A tab bar's frame in its window, in points, with the window's size. */
export interface TabBarFrame {
  x: number;
  y: number;
  width: number;
  height: number;
  windowWidth: number;
  windowHeight: number;
}

export interface ToastHUDProps extends ViewProps {
  cornerRadius: number;
  /**
   * Animates the HUD in or out natively: the backdrop, the children and the
   * motion together. A glass effect view never renders under an ancestor with
   * opacity below 1, so don't fade it from JS.
   */
  visible: boolean;
  /** Called once it has animated away after `visible` turned false. */
  onHidden: () => void;
  /**
   * Where the tab bar the person sees is, wherever UIKit put it: called as
   * soon as the HUD is in a window, then whenever the tab bar moves, appears
   * or goes. `frame` is missing when none shows: on the login, under a sheet,
   * at the top on iPad (where it floats and the bar itself is hidden) and on
   * the Mac.
   */
  onTabBarFrame: (event: NativeSyntheticEvent<{ frame?: TabBarFrame }>) => void;
}

export interface ToastSymbolProps extends ViewProps {
  /** An SF Symbol name. */
  name: string;
  /** The symbol's point size. */
  size: number;
  color: ColorValue;
}

/**
 * The toast HUD, in UIKit: its children over Liquid Glass on iOS 26 and later,
 * blur before. SwiftUI hosts (@expo/ui) don't render inside
 * `FullWindowOverlay`. iOS only.
 */
export const ToastHUD = requireNativeView<ToastHUDProps>(
  'LearnXToast',
  'ToastView',
);

/** An SF Symbol, in UIKit for the same reason. iOS only. */
export const ToastSymbol = requireNativeView<ToastSymbolProps>(
  'LearnXToast',
  'ToastSymbolView',
);
