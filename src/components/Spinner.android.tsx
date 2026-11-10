import {
  CircularProgressIndicator,
  Column,
  Text,
} from '@expo/ui/jetpack-compose';
import { useTheme } from 'theme';
import { percentLabel } from 'helpers/progress';
import type { SpinnerProps } from './Spinner.shared';
import ThemedHost from 'components/ThemedHost';

/**
 * The Material 3 `CircularProgressIndicator` (indeterminate, primary color)
 * with the percentage done under it.
 */
const Spinner: React.FC<SpinnerProps> = ({ progress, style }) => {
  const theme = useTheme();
  const label = percentLabel(progress);

  return (
    <ThemedHost matchContents style={style}>
      <Column
        horizontalAlignment="center"
        verticalArrangement={{ spacedBy: 12 }}
      >
        <CircularProgressIndicator color={theme.colors.primary} />
        {label ? (
          <Text
            color={theme.colors.onSurfaceVariant}
            style={{ typography: 'bodyMedium' }}
          >
            {label}
          </Text>
        ) : null}
      </Column>
    </ThemedHost>
  );
};

export default Spinner;
