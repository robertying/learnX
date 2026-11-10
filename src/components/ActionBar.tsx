import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ContainedButton from 'components/ContainedButton';
import Divider from 'components/Divider';
import TextButton from 'components/TextButton';

export interface BarAction {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
}

export interface ActionBarProps {
  /** The filled button. */
  action: BarAction;
  /** A text button beside or under it, such as Not Now or Full Changelog. */
  secondaryAction?: BarAction;
  /** Content is scrolled under the bar: draws a separator along its top. */
  scrolledUnder?: boolean;
}

const apple = Platform.OS === 'ios';

/**
 * The buttons pinned to the bottom of a page that scrolls above them, as in
 * Apple's welcome and What's New sheets (a large filled button with a text
 * button under it, centered) and Material 3's bottom action bar (the text
 * button and then the filled one, at the end of one row). The welcome page,
 * What's New and the set-up page use it.
 */
const ActionBar: React.FC<ActionBarProps> = ({
  action,
  secondaryAction,
  scrolledUnder,
}) => {
  const insets = useSafeAreaInsets();

  const primary = (
    <ContainedButton
      size="large"
      testID={action.testID}
      label={action.label}
      disabled={action.disabled}
      onPress={action.onPress}
    />
  );
  const secondary = secondaryAction && (
    <TextButton
      size={apple ? 'large' : undefined}
      testID={secondaryAction.testID}
      disabled={secondaryAction.disabled}
      onPress={secondaryAction.onPress}
    >
      {secondaryAction.label}
    </TextButton>
  );

  return (
    <View testID="action-bar">
      {/* Kept in the layout, so the buttons don't move when it shows. */}
      <View
        testID="action-bar-divider"
        style={!scrolledUnder && styles.hidden}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Divider />
      </View>
      <View
        style={[
          styles.bar,
          apple ? styles.appleBar : styles.androidBar,
          { paddingBottom: Math.max(insets.bottom, 16) + 8 },
        ]}
      >
        {apple ? (
          <>
            {primary}
            {/* A full 44 pt row, so it reads as its own button rather than
                a caption of the filled one. */}
            {secondary && (
              <View style={styles.appleSecondary}>{secondary}</View>
            )}
          </>
        ) : (
          <>
            {secondary}
            {primary}
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  hidden: {
    opacity: 0,
  },
  bar: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  appleBar: {
    alignItems: 'center',
    gap: 4,
  },
  appleSecondary: {
    minHeight: 44,
    justifyContent: 'center',
  },
  androidBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
  },
});

export default ActionBar;
