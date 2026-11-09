import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import DeviceInfo from 'constants/DeviceInfo';
import Numbers from 'constants/Numbers';
import { Text } from 'components/Text';

export interface HeaderTitleProps {
  title: string;
  subtitle?: string;
}

// Navigation bar titles keep their size on iOS, as UIKit's do. Android's
// top app bar titles follow the font scale, up to 1.3x so they fit the bar
// beside its buttons.
const allowFontScaling = Platform.OS !== 'ios';
const maxFontSizeMultiplier = 1.3;

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
      <Text
        variant={Platform.OS === 'ios' ? 'headline' : 'title'}
        allowFontScaling={allowFontScaling}
        maxFontSizeMultiplier={maxFontSizeMultiplier}
        numberOfLines={1}
        ellipsizeMode="middle"
      >
        {title}
      </Text>
      {subtitle ? (
        <Text
          variant="caption"
          allowFontScaling={allowFontScaling}
          maxFontSizeMultiplier={maxFontSizeMultiplier}
          style={styles.subtitle}
          numberOfLines={1}
          ellipsizeMode="middle"
        >
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  subtitle: {
    marginTop: 2,
    width: '100%',
    textAlign: Platform.OS === 'android' ? 'left' : 'center',
  },
});

const supportsNativeSubtitle = DeviceInfo.supportsNativeSubtitle();

export const getTitleOptions = (title: string, subtitle?: string) => {
  return supportsNativeSubtitle
    ? { title, headerSubtitle: subtitle }
    : {
        title,
        headerTitle: () => <HeaderTitle title={title} subtitle={subtitle} />,
      };
};

export default HeaderTitle;
