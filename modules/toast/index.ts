import { requireNativeView } from 'expo';
import type { ViewProps } from 'react-native';

export interface ToastBackgroundProps extends ViewProps {
  cornerRadius: number;
}

export interface ToastSymbolProps extends ViewProps {
  /** An SF Symbol name. */
  name: string;
  /** The symbol's point size. */
  size: number;
  color: string;
}

/**
 * The toast HUD's backdrop, in UIKit: Liquid Glass on iOS 26 and later, blur
 * before. SwiftUI hosts (@expo/ui) don't render inside `FullWindowOverlay`.
 * iOS only.
 */
export const ToastBackground = requireNativeView<ToastBackgroundProps>(
  'LearnXToast',
  'ToastBackgroundView',
);

/** An SF Symbol, in UIKit for the same reason. iOS only. */
export const ToastSymbol = requireNativeView<ToastSymbolProps>(
  'LearnXToast',
  'ToastSymbolView',
);
