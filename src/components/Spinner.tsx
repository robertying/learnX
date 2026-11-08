import { PlatformColor, StyleProp, ViewStyle } from 'react-native';
import { Host, ProgressView, Text } from '@expo/ui/swift-ui';
import {
  controlSize,
  foregroundStyle,
  monospacedDigit,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import { useTheme } from 'theme';

export interface SpinnerProps {
  /** Between 0 and 1. Shown as a percentage under the spinner when set. */
  progress?: number;
  style?: StyleProp<ViewStyle>;
}

/** Formats a 0–1 progress as a whole percentage, or nothing before it starts. */
export const percentLabel = (progress?: number) =>
  progress ? `${Math.round(Math.min(Math.max(progress, 0), 1) * 100)}%` : '';

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
