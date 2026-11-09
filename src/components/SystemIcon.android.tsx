import { StyleSheet, Text } from 'react-native';
import { useFonts } from 'expo-font';
import regular from 'expo-symbols/androidWeights/regular';
import { materialCodepoints, systemIcons } from 'helpers/systemIcons';
import type { SystemIconProps } from './SystemIcon.shared';

const fonts = { [regular.name]: regular.font };

/**
 * An icon from `helpers/systemIcons`, drawn as a Material Symbol from
 * expo-symbols' font (outlined, regular weight). Unlike expo-symbols' own
 * view, it keeps its size at large text sizes, as the box it sits in does.
 * Icons are decorative: say what they mean in the row's accessibility label.
 */
const SystemIcon: React.FC<SystemIconProps> = ({
  name,
  size = 24,
  color,
  style,
  testID,
}) => {
  // Loaded once for the app; until then the icon keeps its space empty.
  const [loaded] = useFonts(fonts);
  return (
    <Text
      testID={testID}
      accessible={false}
      importantForAccessibility="no"
      allowFontScaling={false}
      style={[
        styles.icon,
        {
          width: size,
          height: size,
          fontSize: size,
          lineHeight: size,
          color,
        },
        loaded && { fontFamily: regular.name },
        style,
      ]}
    >
      {loaded
        ? String.fromCharCode(materialCodepoints[systemIcons[name].android])
        : ''}
    </Text>
  );
};

const styles = StyleSheet.create({
  icon: {
    textAlign: 'center',
    includeFontPadding: false,
  },
});

export default SystemIcon;
