import { View } from 'react-native';
import { ProgressBar as FluentProgressBar } from '@fluentui/react-components';
import { clampProgress } from 'helpers/progress';
import type { ProgressBarProps } from './ProgressBar.shared';

export type { ProgressBarProps } from './ProgressBar.shared';

/** Fluent's determinate progress bar, in the accent color. */
const ProgressBar: React.FC<ProgressBarProps> = ({ progress, style }) => (
  <View style={style}>
    <FluentProgressBar value={clampProgress(progress)} max={1} />
  </View>
);

export default ProgressBar;
