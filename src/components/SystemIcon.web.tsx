import { createElement } from 'react';
import { View } from 'react-native';
import { systemIcons } from 'helpers/systemIcons';
import { fluentIcon } from 'web/fluentIcons';
import type { SystemIconProps } from './SystemIcon.shared';

/**
 * An icon from `helpers/systemIcons`, drawn as its Fluent System Icon (an
 * inline SVG from `@fluentui/react-icons`) in the Electron app. Icons are
 * decorative: say what they mean in the row's accessibility label.
 */
const SystemIcon: React.FC<SystemIconProps> = ({
  name,
  size = 24,
  color,
  style,
  testID,
  filled,
}) => {
  return (
    <View
      testID={testID}
      accessible={false}
      aria-hidden
      style={[{ width: size, height: size }, style]}
    >
      {createElement(fluentIcon(systemIcons[name].windows, filled), {
        fontSize: size,
        // A color the theme gives as a CSS variable or rgb() string
        color: color as string,
        style: { display: 'block' },
      })}
    </View>
  );
};

export default SystemIcon;
