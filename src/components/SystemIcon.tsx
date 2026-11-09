import { SymbolView } from 'expo-symbols';
import { systemIcons } from 'helpers/systemIcons';
import type { SystemIconProps } from './SystemIcon.shared';

/**
 * An icon from `helpers/systemIcons`, drawn as an SF Symbol by UIKit. It's a
 * plain native view, cheap enough for every row of a list. Icons are
 * decorative: say what they mean in the row's accessibility label.
 */
const SystemIcon: React.FC<SystemIconProps> = ({
  name,
  size = 24,
  color,
  style,
  testID,
}) => (
  <SymbolView
    testID={testID}
    name={systemIcons[name].ios}
    size={size}
    tintColor={color}
    style={style}
    accessible={false}
  />
);

export default SystemIcon;
