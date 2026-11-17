import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Field,
  Input,
} from '@fluentui/react-components';
import dayjs from 'dayjs';
import Spacing from 'constants/Spacing';
import type { DateRangePickerProps } from './DateRangePicker.shared';

export type { DateRangePickerProps } from './DateRangePicker.shared';

/** A date as an `<input type="date">` value, in local time. */
const inputValue = (date: Date) => dayjs(date).format('YYYY-MM-DD');
/** An `<input type="date">` value as a local date, or nothing when cleared. */
const fromInput = (value: string) => {
  const date = dayjs(value, 'YYYY-MM-DD');
  return value && date.isValid() ? date.toDate() : undefined;
};

/**
 * Picks a date range in a Fluent dialog: two date boxes (the system's date
 * picker drops from each), with Save as its primary button.
 */
const DateRangePicker: React.FC<DateRangePickerProps> = props => (
  <Dialog
    open={props.visible}
    onOpenChange={(_event, data) => {
      if (!data.open) {
        props.onDismiss();
      }
    }}
  >
    {/* Mounted per opening (the dialog's surface is), so each one starts
        from the props. */}
    <DateRangeSurface {...props} />
  </Dialog>
);

const DateRangeSurface: React.FC<DateRangePickerProps> = ({
  title,
  startLabel,
  endLabel,
  saveLabel,
  cancelLabel,
  startDate: initialStartDate,
  endDate: initialEndDate,
  onConfirm,
  onDismiss,
}) => {
  const [startDate, setStartDate] = useState(
    () => initialStartDate ?? new Date(),
  );
  const [endDate, setEndDate] = useState(initialEndDate ?? startDate);

  const handleStartChange = (date: Date | undefined) => {
    if (!date) {
      return;
    }
    setStartDate(date);
    if (endDate < date) {
      setEndDate(date);
    }
  };

  return (
    <DialogSurface>
      <DialogBody>
        <DialogTitle>{title}</DialogTitle>
        <DialogContent>
          <View style={styles.fields}>
            <Field label={startLabel}>
              <Input
                type="date"
                value={inputValue(startDate)}
                onChange={(_event, data) =>
                  handleStartChange(fromInput(data.value))
                }
              />
            </Field>
            <Field label={endLabel}>
              <Input
                type="date"
                value={inputValue(endDate)}
                min={inputValue(startDate)}
                onChange={(_event, data) => {
                  const date = fromInput(data.value);
                  if (date && date >= startDate) {
                    setEndDate(date);
                  }
                }}
              />
            </Field>
          </View>
        </DialogContent>
        <DialogActions>
          <Button
            appearance="primary"
            onClick={() => onConfirm({ startDate, endDate })}
          >
            {saveLabel}
          </Button>
          <Button appearance="secondary" onClick={onDismiss}>
            {cancelLabel}
          </Button>
        </DialogActions>
      </DialogBody>
    </DialogSurface>
  );
};

const styles = StyleSheet.create({
  fields: {
    gap: Spacing.m,
    paddingVertical: Spacing.s,
  },
});

export default DateRangePicker;
