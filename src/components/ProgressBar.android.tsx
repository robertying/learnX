import { Host, LinearProgressIndicator } from '@expo/ui/jetpack-compose';
import { fillMaxWidth } from '@expo/ui/jetpack-compose/modifiers';
import { useComposeColorOverrides, useTheme } from 'theme';
import type { ProgressBarProps } from './ProgressBar.shared';

export type { ProgressBarProps } from './ProgressBar.shared';

const modifiers = [fillMaxWidth()];

/** A determinate Material 3 `LinearProgressIndicator` in the primary color. */
const ProgressBar: React.FC<ProgressBarProps> = ({ progress, style }) => {
  const theme = useTheme();
  const colorOverrides = useComposeColorOverrides();

  return (
    <Host
      matchContents={{ vertical: true }}
      seedColor={theme.colors.primary}
      colorOverrides={colorOverrides}
      style={style}
    >
      <LinearProgressIndicator
        progress={Math.min(Math.max(progress, 0), 1)}
        color={theme.colors.primary}
        modifiers={modifiers}
      />
    </Host>
  );
};

export default ProgressBar;
