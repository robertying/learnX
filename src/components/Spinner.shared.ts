import type { StyleProp, ViewStyle } from 'react-native';

export interface SpinnerProps {
  /** Between 0 and 1. Shown as a percentage under the spinner when set. */
  progress?: number;
  style?: StyleProp<ViewStyle>;
}

/** Formats a 0–1 progress as a whole percentage, or nothing before it starts. */
export const percentLabel = (progress?: number) =>
  progress ? `${Math.round(Math.min(Math.max(progress, 0), 1) * 100)}%` : '';
