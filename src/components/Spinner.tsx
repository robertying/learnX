import { PlatformColor } from 'react-native';
import { Host, ProgressView, Text } from '@expo/ui/swift-ui';
import {
  controlSize,
  foregroundStyle,
  monospacedDigit,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import { useTheme } from 'theme';
import { percentLabel } from 'helpers/progress';
import type { SpinnerProps } from './Spinner.shared';

/**
 * The system activity indicator (SwiftUI `ProgressView`, large, primary tint)
 * with the percentage done as its label.
 */
const Spinner: React.FC<SpinnerProps> = ({ progress, style }) => {
  const theme = useTheme();
  const label = percentLabel(progress);

  return (
    <Host matchContents style={style}>
      <ProgressView
        modifiers={[controlSize('large'), tint(theme.colors.primary)]}
      >
        {label ? (
          <Text
            modifiers={[
              monospacedDigit(),
              // A hierarchical style would take the tint.
              foregroundStyle(PlatformColor('secondaryLabel')),
            ]}
          >
            {label}
          </Text>
        ) : null}
      </ProgressView>
    </Host>
  );
};

export default Spinner;
