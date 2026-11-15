import type { SystemIconName } from 'helpers/systemIcons';

export interface OverflowMenuItem {
  id: string;
  label: string;
  icon: SystemIconName;
  onPress: () => void;
}

export interface OverflowMenuProps {
  /** The button's accessibility label */
  label: string;
  items: OverflowMenuItem[];
  testID?: string;
}
