import { DateRangePickerDialog, Host } from '@expo/ui/jetpack-compose';
import type { DateRangePickerProps } from './DateRangePicker';
import { useTheme } from 'theme';

/** Material 3's date range picker dialog. */
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
        initialStartDate={startDate?.toISOString()}
        initialEndDate={endDate?.toISOString()}
        showTitle={!!title}
        confirmButtonLabel={saveLabel}
        dismissButtonLabel={cancelLabel}
        color={theme.colors.primary}
        onDateRangeSelected={({ start, end }) => {
          if (start && end) {
            onConfirm({ startDate: start, endDate: end });
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
