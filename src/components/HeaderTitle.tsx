import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Text } from 'react-native-paper';
import DeviceInfo from 'constants/DeviceInfo';
import Numbers from 'constants/Numbers';

export interface HeaderTitleProps {
  title: string;
  subtitle?: string;
}

const HeaderTitle: React.FC<React.PropsWithChildren<HeaderTitleProps>> = ({
  title,
  subtitle,
}) => {
  const { width } = useWindowDimensions();
  // Wide windows (tablets, unfolded foldables) get the roomy header, like the split view.
  const isWide =
    DeviceInfo.isTablet() || width > Numbers.splitViewMaxCollapsedWidth;

  return (
    <View
      style={{
        maxWidth: Platform.OS === 'android' && !isWide ? 250 : undefined,
        height: Platform.OS === 'android' ? (isWide ? 64 : 56) : 44,
        justifyContent: 'center',
        alignItems: Platform.OS === 'android' ? 'flex-start' : 'center',
      }}
    >
      <Text style={styles.title} numberOfLines={1} ellipsizeMode="middle">
        {title}
      </Text>
      {subtitle ? (
        <Text style={styles.subtitle} numberOfLines={1} ellipsizeMode="middle">
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: Platform.OS === 'ios' ? 17 : 20,
    fontWeight: Platform.OS === 'ios' ? '600' : 'bold',
  },
  subtitle: {
    fontSize: 11,
    marginTop: 2,
    width: '100%',
    textAlign: Platform.OS === 'android' ? 'left' : 'center',
  },
});

export default HeaderTitle;
