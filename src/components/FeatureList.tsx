import { useRef, useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ActionBar, { BarAction } from 'components/ActionBar';
import Divider from 'components/Divider';
import Logo from 'components/Logo';
import SystemIcon from 'components/SystemIcon';
import { Caption, Headline, Title } from 'components/Text';
import type { SystemIconName } from 'helpers/systemIcons';
import { useTheme } from 'theme';

export interface Feature {
  icon: SystemIconName;
  title: string;
  body: string;
}

export interface FeatureListProps {
  title: string;
  features: Feature[];
  /** The app icon's X above the title, for the welcome page. */
  logo?: boolean;
  /** The filled button at the bottom. */
  action: BarAction;
  /** A text button beside or under it, such as Full Changelog. */
  secondaryAction?: BarAction;
  /** Shown in a sheet, which starts below the status bar. */
  sheet?: boolean;
  testID?: string;
}

const apple = Platform.OS === 'ios';

/**
 * A page of features under a title, with a button at the bottom: Apple's
 * "Welcome to" and "What's New" sheets on iOS, iPadOS and Mac (centered
 * title, symbols in the accent color), and a Material 3 page on Android
 * (start-aligned title, icons in tonal circles). The welcome page and What's
 * New both use it.
 */
const FeatureList: React.FC<FeatureListProps> = ({
  title,
  features,
  logo,
  action,
  secondaryAction,
  sheet,
  testID,
}) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  // The scroll view's height, its content's and how far it's scrolled, for
  // whether content is hidden under the buttons.
  const scroll = useRef({ height: 0, content: 0, offset: 0 });
  const [scrolledUnder, setScrolledUnder] = useState(false);
  const [scrolledPast, setScrolledPast] = useState(false);
  const measure = (change: Partial<typeof scroll.current>) => {
    scroll.current = { ...scroll.current, ...change };
    const { height, content, offset } = scroll.current;
    setScrolledUnder(height > 0 && content - offset - height > 1);
    setScrolledPast(offset > 1);
  };
  // Symbols grow with the text (Dynamic Type, Android font scale), up to
  // about the size of the title's line.
  const { fontScale } = useWindowDimensions();
  const iconScale = Math.min(Math.max(fontScale, 1), 1.6);

  return (
    <View
      testID={testID}
      style={[styles.root, { backgroundColor: theme.colors.background }]}
    >
      {/* The title stays put and only the features scroll, between it and
          the buttons. Together they sit in the middle of the page when the
          features fit, as on iPad, Mac or a tall phone. The views around the
          ScrollView stay real (not flattened): a form sheet
          (react-native-screens) stretches a ScrollView it finds at the top of
          the screen to the whole sheet, over the title. */}
      <View
        collapsable={false}
        style={[
          styles.middle,
          { paddingTop: (sheet ? 0 : insets.top) + (logo ? 16 : 32) },
        ]}
      >
        <View collapsable={false} style={styles.header}>
          {logo && <Logo iosSize={96} style={styles.logo} />}
          <Title
            variant="largeTitle"
            style={styles.title}
            accessibilityRole="header"
          >
            {title}
          </Title>
        </View>
        {/* Under the title once the features scroll up under it; kept in
            the layout, so they don't move when it shows. */}
        <View
          testID={testID && `${testID}-title-divider`}
          style={!scrolledPast && styles.hidden}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Divider />
        </View>
        <ScrollView
          testID={testID && `${testID}-scroll`}
          style={styles.scroll}
          contentContainerStyle={styles.content}
          alwaysBounceVertical={false}
          onLayout={event =>
            measure({ height: event.nativeEvent.layout.height })
          }
          onContentSizeChange={(_, height) => measure({ content: height })}
          onScroll={event =>
            measure({ offset: event.nativeEvent.contentOffset.y })
          }
          scrollEventThrottle={16}
        >
          <View style={styles.features}>
            {features.map(feature => (
              <View
                key={feature.title}
                style={styles.feature}
                accessible
                accessibilityLabel={`${feature.title}, ${feature.body}`}
              >
                <View
                  testID="feature-icon"
                  style={[
                    styles.iconBox,
                    apple && { width: 40 * iconScale, height: 22 * iconScale },
                    !apple && {
                      backgroundColor: theme.colors.primaryContainer,
                    },
                  ]}
                >
                  <SystemIcon
                    name={feature.icon}
                    size={(apple ? 30 : 24) * iconScale}
                    color={
                      apple
                        ? theme.colors.primary
                        : theme.colors.onPrimaryContainer
                    }
                  />
                </View>
                <View style={styles.featureText}>
                  <Headline>{feature.title}</Headline>
                  <Caption variant="subheadline">{feature.body}</Caption>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
      <ActionBar
        action={action}
        secondaryAction={secondaryAction}
        scrolledUnder={scrolledUnder}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  hidden: {
    opacity: 0,
  },
  middle: {
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    paddingHorizontal: apple ? 40 : 24,
  },
  // As tall as the features, up to the room left between the title and the
  // buttons.
  scroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  content: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    paddingHorizontal: apple ? 40 : 24,
    paddingBottom: 24,
  },
  // The icon image has room around the X: less pulled in below than Logo's
  // default, so the X clears the title, and pulled back on Android so the X
  // lines up with the title's start.
  logo: {
    alignSelf: apple ? 'center' : 'flex-start',
    marginBottom: apple ? -8 : -24,
    marginStart: apple ? 0 : -28,
  },
  title: {
    textAlign: apple ? 'center' : 'auto',
    marginTop: 8,
    marginBottom: 32,
  },
  features: {
    gap: 28,
  },
  // Each icon lines up with the first line of its title, however many lines
  // the text below takes.
  feature: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  // A column as wide as Android's tonal circle, so every title starts at the
  // same place. On Apple platforms it's one headline line tall, and the
  // symbol is centered on it.
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
    gap: 2,
    paddingTop: apple ? 0 : 8,
  },
});

export default FeatureList;
