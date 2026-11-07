import { StyleSheet, View, ViewProps } from 'react-native';
import { useTheme } from 'theme';

/** A hairline separator in the outline color. */
const Divider: React.FC<ViewProps> = ({ style, ...rest }) => {
  const theme = useTheme();
  return (
    <View
      {...rest}
      style={[
        styles.divider,
        { backgroundColor: theme.colors.outlineVariant },
        style,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  divider: {
    height: StyleSheet.hairlineWidth,
  },
});

export default Divider;
