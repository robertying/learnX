import { useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { DatePicker, Form, Host, Section } from '@expo/ui/swift-ui';
import TextButton from 'components/TextButton';
import { Text } from 'components/Text';
import { useTheme } from 'theme';

export interface DateRangePickerProps {
  visible: boolean;
  title: string;
  startLabel: string;
  endLabel: string;
  saveLabel: string;
  cancelLabel: string;
  startDate?: Date;
  endDate?: Date;
  onConfirm: (range: { startDate: Date; endDate: Date }) => void;
  onDismiss: () => void;
}

/**
 * Picks a date range. iOS and Mac show a sheet with two system date pickers
 * (SwiftUI has no range picker); Android shows Material's date range picker
 * dialog (DateRangePicker.android.tsx).
 */
const DateRangePicker: React.FC<DateRangePickerProps> = props => {
  const { visible, onDismiss } = props;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="formSheet"
      onRequestClose={onDismiss}
    >
      {visible ? <DateRangeSheet {...props} /> : null}
    </Modal>
  );
};

const DateRangeSheet: React.FC<DateRangePickerProps> = ({
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
  const theme = useTheme();
  const [startDate, setStartDate] = useState(
    () => initialStartDate ?? new Date(),
  );
  const [endDate, setEndDate] = useState(initialEndDate ?? startDate);

  const handleStartChange = (date: Date) => {
    setStartDate(date);
    if (endDate < date) {
      setEndDate(date);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <TextButton containerStyle={styles.headerButton} onPress={onDismiss}>
          {cancelLabel}
        </TextButton>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <TextButton
          containerStyle={styles.headerButton}
          style={styles.save}
          onPress={() => onConfirm({ startDate, endDate })}
        >
          {saveLabel}
        </TextButton>
      </View>
      <Host style={styles.form}>
        <Form>
          <Section>
            <DatePicker
              title={startLabel}
              selection={startDate}
              displayedComponents={['date']}
              onDateChange={handleStartChange}
            />
            <DatePicker
              title={endLabel}
              selection={endDate}
              range={{ start: startDate }}
              displayedComponents={['date']}
              onDateChange={setEndDate}
            />
          </Section>
        </Form>
      </Host>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingTop: 12,
    minHeight: 56,
  },
  headerButton: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '600',
  },
  save: {
    fontWeight: '600',
  },
  form: {
    flex: 1,
  },
});

export default DateRangePicker;
