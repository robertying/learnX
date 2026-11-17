import { View } from 'react-native';
import { Spinner as FluentSpinner } from '@fluentui/react-components';
import { percentLabel } from 'helpers/progress';
import type { SpinnerProps } from './Spinner.shared';

/** Fluent's spinner, with the percentage done under it when known. */
const Spinner: React.FC<SpinnerProps> = ({ progress, style }) => (
  <View style={style}>
    <FluentSpinner
      size="large"
      labelPosition="below"
      label={percentLabel(progress) || undefined}
    />
  </View>
);

export default Spinner;
