import type { StyleProp, ViewStyle } from 'react-native';
import type { SystemIconName } from 'helpers/systemIcons';

export interface SystemIconProps {
  name: SystemIconName;
  /** Width and height, in points. It doesn't grow with the text size. */
  size?: number;
  color: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}
