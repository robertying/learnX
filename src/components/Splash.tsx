import { StyleSheet, View } from 'react-native';
import Logo from 'components/Logo';
import { useTheme } from 'theme';

const Splash: React.FC = () => {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.center,
        {
          backgroundColor: theme.colors.surface,
        },
      ]}
    >
      <Logo iosSize={160} />
    </View>
  );
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default Splash;
