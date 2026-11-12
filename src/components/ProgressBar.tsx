import { ProgressView } from '@expo/ui/swift-ui';
import { animation, Animation } from '@expo/ui/swift-ui/modifiers';
import ThemedHost from 'components/ThemedHost';
import { clampProgress } from 'helpers/progress';
import type { ProgressBarProps } from './ProgressBar.shared';

export type { ProgressBarProps } from './ProgressBar.shared';

/** A determinate SwiftUI `ProgressView` (linear), in the theme's tint. */
const ProgressBar: React.FC<ProgressBarProps> = ({ progress, style }) => {
  const value = clampProgress(progress);

  return (
    <ThemedHost matchContents={{ vertical: true }} style={style}>
      <ProgressView
        value={value}
        modifiers={[animation(Animation.easeInOut({ duration: 0.2 }), value)]}
      />
    </ThemedHost>
  );
};

export default ProgressBar;
