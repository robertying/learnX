import { Button } from '@expo/ui';
import { CircularProgressIndicator, Row, Text } from '@expo/ui/jetpack-compose';
import { size } from '@expo/ui/jetpack-compose/modifiers';
import { useMaterialTheme } from 'theme';
import ThemedHost from 'components/ThemedHost';
import type { ContainedButtonProps } from './ContainedButton.shared';

export type { ContainedButtonProps } from './ContainedButton.shared';

// An icon's size in a Material 3 button.
const spinnerModifiers = [size(18, 18)];

/**
 * The system's filled button, tinted with the theme's primary color. While
 * loading, a small circular indicator takes the place of a leading icon, in
 * the disabled button's content color.
 */
const ContainedButton: React.FC<ContainedButtonProps> = ({
  label,
  disabled,
  loading,
  onPress,
  style,
  testID,
}) => {
  const theme = useMaterialTheme();
  return (
    <ThemedHost matchContents style={style}>
      <Button
        testID={testID}
        label={label}
        disabled={disabled || loading}
        onPress={onPress}
      >
        {loading ? (
          <Row
            verticalAlignment="center"
            horizontalArrangement={{ spacedBy: 8 }}
          >
            <CircularProgressIndicator
              strokeWidth={2}
              color={theme.colors.onSurfaceDisabled}
              modifiers={spinnerModifiers}
            />
            <Text>{label}</Text>
          </Row>
        ) : undefined}
      </Button>
    </ThemedHost>
  );
};

export default ContainedButton;
