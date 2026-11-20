import { View } from 'react-native';
import { Spinner as FluentSpinner } from '@fluentui/react-components';
import { t } from 'helpers/i18n';
import { percentLabel } from 'helpers/progress';
import type { SpinnerProps } from './Spinner.shared';

/**
 * Fluent's spinner, with the percentage done under it when known, which
 * names it; without one, screen readers say it's loading.
 */
const Spinner: React.FC<SpinnerProps> = ({ progress, style }) => {
  const label = percentLabel(progress);
  return (
    <View style={style}>
      <FluentSpinner
        size="large"
        labelPosition="below"
        label={label || undefined}
        aria-label={label ? undefined : t('a11yLoading')}
      />
    </View>
  );
};

export default Spinner;
