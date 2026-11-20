import { StyleSheet, View } from 'react-native';
import { Button, tokens, Tooltip } from '@fluentui/react-components';
import BadgeDot from 'components/Badge';
import SystemIcon from 'components/SystemIcon';
import { useTheme } from 'theme';
import { spokenLabel, type IconButtonProps } from './IconButton.shared';

export type { IconButtonIcon, IconButtonProps } from './IconButton.shared';

/**
 * An icon-only Fluent button (subtle, as in a Windows command bar) with the
 * icon's Fluent System Icon and its label as a tooltip. `contained` shows the
 * button toggled on.
 */
const IconButton: React.FC<IconButtonProps> = ({
  icon,
  size = 20,
  mode,
  pressed,
  badge,
  disabled,
  onPress,
  accessibilityLabel,
  testID,
  style,
}) => {
  const theme = useTheme();
  // Fluent's command bar icons are 20 px; the app's mobile sizes are 24.
  const iconSize = Math.min(size, 20);
  const button = (
    <Button
      appearance={mode === 'contained' ? 'primary' : 'subtle'}
      shape={mode === 'contained' ? 'circular' : 'rounded'}
      disabled={disabled}
      onClick={onPress}
      aria-label={spokenLabel({ accessibilityLabel, badge })}
      aria-pressed={pressed}
      data-testid={testID}
      icon={
        <SystemIcon
          name={icon}
          size={iconSize}
          color={
            disabled
              ? theme.colors.onSurfaceDisabled
              : mode === 'contained'
                ? // Fluent's text on its accent fill, white in both themes
                  tokens.colorNeutralForegroundOnBrand
                : theme.colors.onSurface
          }
        />
      }
    />
  );
  return (
    <View style={[styles.root, style]}>
      {/* The button's own box, which the badge sits on. */}
      <View>
        {accessibilityLabel ? (
          // The button has its own label: the tooltip only shows it.
          <Tooltip content={accessibilityLabel} relationship="inaccessible">
            {button}
          </Tooltip>
        ) : (
          button
        )}
        {badge && <BadgeDot style={styles.badge} />}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Holds the button at its own size wherever it's placed, without taking
  // the place itself (`alignSelf` would override a row's centering).
  root: {
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
});

export default IconButton;
