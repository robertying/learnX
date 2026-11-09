import { StyleProp, ViewStyle } from 'react-native';
import { Host, ProgressView } from '@expo/ui/swift-ui';
import { animation, Animation, tint } from '@expo/ui/swift-ui/modifiers';
import { useTheme } from 'theme';

export interface ProgressBarProps {
  /** Between 0 and 1. */
  progress: number;
  style?: StyleProp<ViewStyle>;
}

/** A determinate SwiftUI `ProgressView` (linear) tinted with the primary color. */
const ProgressBar: React.FC<ProgressBarProps> = ({ progress, style }) => {
  const theme = useTheme();
  const value = Math.min(Math.max(progress, 0), 1);

  return (
    <Host matchContents={{ vertical: true }} style={style}>
      <ProgressView
        value={value}
        modifiers={[
          tint(theme.colors.primary),
          animation(Animation.easeInOut({ duration: 0.2 }), value),
        ]}
      />
    </Host>
  );
};

export default ProgressBar;
