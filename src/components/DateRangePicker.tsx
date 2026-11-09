import { useState } from 'react';
import { StyleSheet } from 'react-native';
import {
  BottomSheet,
  Button,
  DatePicker,
  Form,
  Host,
  NavigationStack,
  Section,
  Toolbar,
  ToolbarItem,
} from '@expo/ui/swift-ui';
import {
  navigationBarTitleDisplayMode,
  navigationTitle,
  presentationDetents,
  tint,
} from '@expo/ui/swift-ui/modifiers';
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
 * Picks a date range. iOS and Mac present a SwiftUI sheet with Cancel and Save
 * in its navigation bar over two system date pickers (SwiftUI has no range
 * picker); Android shows Material's date range picker dialog
 * (DateRangePicker.android.tsx).
 */
const DateRangePicker: React.FC<DateRangePickerProps> = props => {
  const { visible, onDismiss } = props;

  // SwiftUI presents the sheet over the whole window, wherever this sits.
  return (
    <Host style={styles.anchor}>
      <BottomSheet
        isPresented={visible}
        onIsPresentedChange={isPresented => {
          // Swiped down: Save closes it through `visible` instead.
          if (!isPresented && visible) {
            onDismiss();
          }
        }}
      >
        {/* Mounted per presentation, so each opening starts from the props. */}
        <DateRangeSheet {...props} />
      </BottomSheet>
    </Host>
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
    <NavigationStack
      modifiers={[
        presentationDetents(['medium', 'large']),
        tint(theme.colors.primary),
      ]}
    >
      <Toolbar
        modifiers={[
          navigationTitle(title),
          navigationBarTitleDisplayMode('inline'),
        ]}
      >
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
        <Toolbar.Content>
          <ToolbarItem placement="cancellationAction">
            <Button label={cancelLabel} role="cancel" onPress={onDismiss} />
          </ToolbarItem>
          <ToolbarItem placement="confirmationAction">
            <Button
              label={saveLabel}
              onPress={() => onConfirm({ startDate, endDate })}
            />
          </ToolbarItem>
        </Toolbar.Content>
      </Toolbar>
    </NavigationStack>
  );
};

const styles = StyleSheet.create({
  // Holds only the sheet's zero-size anchor.
  anchor: {
    position: 'absolute',
    width: 0,
    height: 0,
  },
});

export default DateRangePicker;
