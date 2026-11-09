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
