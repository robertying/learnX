import type { FilterOption, FilterSelection } from 'helpers/filters';

export interface FilterMenuProps {
  /** The button's accessibility label */
  label: string;
  options: FilterOption[];
  selected: FilterSelection;
  onSelectionChange: (selected: FilterSelection) => void;
}
