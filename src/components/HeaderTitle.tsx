import { StyleSheet, View, useWindowDimensions } from 'react-native';
import DeviceInfo from 'constants/DeviceInfo';
import SplitSizes from 'constants/SplitSizes';
import { Text } from 'components/Text';
import { isAndroid, isApple } from 'helpers/platform';

export interface HeaderTitleProps {
  title: string;
  subtitle?: string;
  /**
   * Where a title too long for the bar is shortened: at the end for a
   * screen's name, in the middle for an item's (a course or file name,
   * whose end tells it apart).
   * @default 'tail'
   */
  ellipsizeMode?: 'tail' | 'middle';
}

// Navigation bar titles keep their size on iOS, as UIKit's do. Android's
// top app bar titles follow the font scale, up to 1.3x so they fit the bar
// beside its buttons.
const allowFontScaling = !isApple();
const maxFontSizeMultiplier = 1.3;

/**
 * The header bar's height: Material 3's top app bar (64 dp) on Android, the
 * navigation bar's elsewhere. The title and Android's header buttons are as
 * tall, so their middles line up with the back button's and the search
 * field's.
 */
export const headerBarHeight = () => (isAndroid() ? 64 : 44);

const HeaderTitle: React.FC<HeaderTitleProps> = ({
  title,
  subtitle,
  ellipsizeMode = 'tail',
}) => {
  const { width } = useWindowDimensions();
  // Wide windows (tablets, unfolded foldables) get the roomy header, like the split view.
  const isWide = DeviceInfo.isTablet() || width > SplitSizes.maxCollapsedWidth;

  return (
    <View
      style={{
        maxWidth: isAndroid() && !isWide ? 250 : undefined,
        height: headerBarHeight(),
        justifyContent: 'center',
        alignItems: isAndroid() ? 'flex-start' : 'center',
      }}
    >
      <Text
        variant={isApple() ? 'headline' : 'title'}
        allowFontScaling={allowFontScaling}
        maxFontSizeMultiplier={maxFontSizeMultiplier}
        numberOfLines={1}
        ellipsizeMode={ellipsizeMode}
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
    textAlign: isAndroid() ? 'left' : 'center',
  },
});

export default HeaderTitle;
