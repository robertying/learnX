import type { StyleProp, ViewStyle } from 'react-native';

// Props shared by Chip.tsx (iOS, iPadOS, Mac) and Chip.android.tsx (Compose).

export interface ChipProps {
  /** The label, on one line. */
  children: string;
  style?: StyleProp<ViewStyle>;
}
