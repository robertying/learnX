import type { SystemIconName } from 'helpers/systemIcons';

export interface ToggleMenuOption {
  name: string;
  label: string;
  icon: SystemIconName;
  on: boolean;
}

export interface ToggleMenuProps {
  /** The button's accessibility label */
  label: string;
  options: ToggleMenuOption[];
  /** Shows the button filled, when the options aren't at their defaults. */
  active: boolean;
  onToggle: (name: string) => void;
}
