// On iOS and Mac the filter menu is the header filter button's own UIMenu
// (hooks/useFilterListHeader), so nothing renders in the list.
import type { FilterSelection } from 'helpers/filterOptions';
import type { FilterOption } from 'helpers/filterOptions';

export interface FilterMenuProps {
  visible: boolean;
  options: FilterOption[];
  selected: FilterSelection;
  onSelectionChange: (selected: FilterSelection) => void;
  onDismiss: () => void;
}

const FilterMenu: React.FC<FilterMenuProps> = () => null;

export default FilterMenu;
