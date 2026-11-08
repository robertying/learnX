import { DateRangePickerDialog, Host } from '@expo/ui/jetpack-compose';
import type { DateRangePickerProps } from './DateRangePicker';
import { useTheme } from 'theme';

// Compose's date pickers work in UTC-midnight days: send each local day as that
// day's UTC midnight and read the picked days back as local midnights.
const toPickerDay = (date: Date | undefined) =>
  date
    ? new Date(
        Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
      ).toISOString()
    : undefined;
const fromPickerDay = (date: Date) =>
  new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());

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
    <Host>
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
    </Host>
  );
};

export default DateRangePicker;
