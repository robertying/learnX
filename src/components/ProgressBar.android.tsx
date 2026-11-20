import { LinearProgressIndicator } from '@expo/ui/jetpack-compose';
import { fillMaxWidth, semantics } from '@expo/ui/jetpack-compose/modifiers';
import { clampProgress } from 'helpers/progress';
import type { ProgressBarProps } from './ProgressBar.shared';
import ThemedHost from 'components/ThemedHost';

export type { ProgressBarProps } from './ProgressBar.shared';

/** A determinate Material 3 `LinearProgressIndicator` in the primary color. */
const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  accessibilityLabel,
  style,
}) => {
  return (
    <ThemedHost matchContents={{ vertical: true }} style={style}>
      <LinearProgressIndicator
        progress={clampProgress(progress)}
        modifiers={[
          fillMaxWidth(),
          // Said with the percentage TalkBack reads for the bar.
          ...(accessibilityLabel
            ? [semantics({ contentDescription: accessibilityLabel })]
            : []),
        ]}
      />
    </ThemedHost>
  );
};

export default ProgressBar;
