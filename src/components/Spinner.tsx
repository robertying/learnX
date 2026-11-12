import { PlatformColor } from 'react-native';
import { ProgressView, Text } from '@expo/ui/swift-ui';
import {
  controlSize,
  foregroundStyle,
  monospacedDigit,
} from '@expo/ui/swift-ui/modifiers';
import ThemedHost from 'components/ThemedHost';
import { percentLabel } from 'helpers/progress';
import type { SpinnerProps } from './Spinner.shared';

/**
 * The system activity indicator (SwiftUI `ProgressView`, large, primary tint)
 * with the percentage done as its label.
 */
const Spinner: React.FC<SpinnerProps> = ({ progress, style }) => {
  const label = percentLabel(progress);

  return (
    <ThemedHost matchContents style={style}>
      <ProgressView modifiers={[controlSize('large')]}>
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
    </ThemedHost>
  );
};

export default Spinner;
