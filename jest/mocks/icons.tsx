import { View, ViewProps } from 'react-native';

/**
 * Stand-in for a @react-native-vector-icons font. The packages ship ESM only
 * and draw glyphs from a native font, so tests get a view whose testID names
 * the icon (`icon-<name>`).
 */
const Icon = ({ name, ...props }: ViewProps & { name: string }) => (
  <View {...props} testID={`icon-${name}`} />
);
Icon.getImageSourceSync = () => ({ uri: '' });

export default Icon;
