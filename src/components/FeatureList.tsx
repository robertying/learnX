import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ContainedButton from 'components/ContainedButton';
import Logo from 'components/Logo';
import SystemIcon from 'components/SystemIcon';
import { Caption, Headline, Title } from 'components/Text';
import TextButton from 'components/TextButton';
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
  action: { label: string; onPress: () => void; testID?: string };
  /** A text button beside or under it, such as Full Changelog. */
  secondaryAction?: { label: string; onPress: () => void; testID?: string };
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

  return (
    // One ScrollView with the buttons at the end of its content: a form
    // sheet (react-native-screens) only lays out a ScrollView that is the
    // screen's only child, and draws the content blank otherwise.
    <ScrollView
      testID={testID}
      style={[styles.root, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.container}
    >
      <View
        style={[
          styles.content,
          { paddingTop: (sheet ? 0 : insets.top) + (logo ? 32 : 48) },
        ]}
      >
        {logo && <Logo iosSize={96} style={styles.logo} />}
        <Title
          variant="largeTitle"
          style={styles.title}
          accessibilityRole="header"
        >
          {title}
        </Title>
        <View style={styles.features}>
          {features.map(feature => (
            <View
              key={feature.title}
              style={styles.feature}
              accessible
              accessibilityLabel={`${feature.title}, ${feature.body}`}
            >
              {apple ? (
                <SystemIcon
                  name={feature.icon}
                  size={34}
                  color={theme.colors.primary}
                  style={styles.icon}
                />
              ) : (
                <View
                  style={[
                    styles.iconCircle,
                    { backgroundColor: theme.colors.primaryContainer },
                  ]}
                >
                  <SystemIcon
                    name={feature.icon}
                    size={24}
                    color={theme.colors.onPrimaryContainer}
                  />
                </View>
              )}
              <View style={styles.featureText}>
                <Headline>{feature.title}</Headline>
                <Caption variant="subheadline">{feature.body}</Caption>
              </View>
            </View>
          ))}
        </View>
      </View>
      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom, 16) + 8 },
        ]}
      >
        {apple ? (
          <>
            <ContainedButton
              style={styles.button}
              testID={action.testID}
              label={action.label}
              onPress={action.onPress}
            />
            {secondaryAction && (
              <TextButton
                style={styles.button}
                testID={secondaryAction.testID}
                onPress={secondaryAction.onPress}
              >
                {secondaryAction.label}
              </TextButton>
            )}
          </>
        ) : (
          <View style={styles.androidButtons}>
            {secondaryAction && (
              <TextButton
                testID={secondaryAction.testID}
                onPress={secondaryAction.onPress}
              >
                {secondaryAction.label}
              </TextButton>
            )}
            <ContainedButton
              testID={action.testID}
              label={action.label}
              onPress={action.onPress}
            />
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  // Fills the page, so the buttons sit at the bottom when it's short.
  container: {
    flexGrow: 1,
    justifyContent: 'space-between',
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
    marginBottom: 40,
  },
  features: {
    gap: 28,
  },
  feature: {
    flexDirection: 'row',
    alignItems: apple ? 'center' : 'flex-start',
    gap: 16,
  },
  icon: {
    width: 40,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
    gap: 2,
  },
  footer: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: 12,
    alignItems: 'center',
    gap: 8,
  },
  button: {
    alignSelf: 'center',
  },
  androidButtons: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
  },
});

export default FeatureList;
