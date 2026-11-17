import type { ColorValue, StyleProp, ViewStyle } from 'react-native';
import type { SystemIconName } from 'helpers/systemIcons';

export interface SystemIconProps {
  name: SystemIconName;
  /** Width and height, in points. It doesn't grow with the text size. */
  size?: number;
  color: ColorValue;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  /**
   * The Electron app: the icon's filled variant where it has one (a selected
   * tab, a toast's outcome). Other platforms pick theirs by name.
   */
  filled?: boolean;
}
