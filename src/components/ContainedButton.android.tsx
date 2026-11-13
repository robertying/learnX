import { Button } from '@expo/ui';
import ThemedHost from 'components/ThemedHost';
import type { ContainedButtonProps } from './ContainedButton.shared';

export type { ContainedButtonProps } from './ContainedButton.shared';

/** The system's filled button, tinted with the theme's primary color. */
const ContainedButton: React.FC<ContainedButtonProps> = ({
  label,
  disabled,
  onPress,
  style,
  testID,
}) => (
  <ThemedHost matchContents style={style}>
    <Button
      testID={testID}
      label={label}
      disabled={disabled}
      onPress={onPress}
    />
  </ThemedHost>
);

export default ContainedButton;
