import { DateRangePickerDialog } from '@expo/ui/jetpack-compose';
import { fromPickerDay, toPickerDay } from 'helpers/pickerDay';
import type { DateRangePickerProps } from './DateRangePicker.shared';
import { useTheme } from 'theme';
import ThemedHost from 'components/ThemedHost';

/**
 * Material 3's date range picker dialog. Compose doesn't take a custom title,
 * so `title` only decides whether its default one shows.
 */
const DateRangePicker: React.FC<DateRangePickerProps> = ({
  visible,
  title,
  saveLabel,
  cancelLabel,
  startDate,
  endDate,
  onConfirm,
  onDismiss,
}) => {
  const theme = useTheme();

  if (!visible) {
    return null;
  }

  return (
    <ThemedHost>
      <DateRangePickerDialog
        initialStartDate={toPickerDay(startDate)}
        initialEndDate={toPickerDay(endDate)}
        showTitle={!!title}
        confirmButtonLabel={saveLabel}
        dismissButtonLabel={cancelLabel}
        color={theme.colors.primary}
        onDateRangeSelected={({ start, end }) => {
          if (start && end) {
            onConfirm({
              startDate: fromPickerDay(start),
              endDate: fromPickerDay(end),
            });
          } else {
            onDismiss();
          }
        }}
        onDismissRequest={onDismiss}
      />
    </ThemedHost>
  );
};

export default DateRangePicker;
