import { Host, ProgressView } from '@expo/ui/swift-ui';
import { animation, Animation, tint } from '@expo/ui/swift-ui/modifiers';
import { clampProgress } from 'helpers/progress';
import { useTheme } from 'theme';
import type { ProgressBarProps } from './ProgressBar.shared';

export type { ProgressBarProps } from './ProgressBar.shared';

/** A determinate SwiftUI `ProgressView` (linear) tinted with the primary color. */
const ProgressBar: React.FC<ProgressBarProps> = ({ progress, style }) => {
  const theme = useTheme();
  const value = clampProgress(progress);

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
