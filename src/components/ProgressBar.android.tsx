import { LinearProgressIndicator } from '@expo/ui/jetpack-compose';
import { fillMaxWidth } from '@expo/ui/jetpack-compose/modifiers';
import { clampProgress } from 'helpers/progress';
import { useTheme } from 'theme';
import type { ProgressBarProps } from './ProgressBar.shared';
import ThemedHost from 'components/ThemedHost';

export type { ProgressBarProps } from './ProgressBar.shared';

const modifiers = [fillMaxWidth()];

/** A determinate Material 3 `LinearProgressIndicator` in the primary color. */
const ProgressBar: React.FC<ProgressBarProps> = ({ progress, style }) => {
  const theme = useTheme();

  return (
    <ThemedHost matchContents={{ vertical: true }} style={style}>
      <LinearProgressIndicator
        progress={clampProgress(progress)}
        color={theme.colors.primary}
        modifiers={modifiers}
      />
    </ThemedHost>
  );
};

export default ProgressBar;
