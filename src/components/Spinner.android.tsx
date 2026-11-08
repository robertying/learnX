import {
  CircularProgressIndicator,
  Column,
  Host,
  Text,
} from '@expo/ui/jetpack-compose';
import { useComposeColorOverrides, useTheme } from 'theme';
import { percentLabel, type SpinnerProps } from './Spinner';

/**
 * The Material 3 `CircularProgressIndicator` (indeterminate, primary color)
 * with the percentage done under it.
 */
const Spinner: React.FC<SpinnerProps> = ({ progress, style }) => {
  const theme = useTheme();
  const colorOverrides = useComposeColorOverrides();
  const label = percentLabel(progress);

  return (
    <Host
      matchContents
      seedColor={theme.colors.primary}
      colorOverrides={colorOverrides}
      style={style}
    >
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
    </Host>
  );
};

export default Spinner;
