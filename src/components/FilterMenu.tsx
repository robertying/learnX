// On iOS and Mac the filter button and its menu are a native header menu item
// (hooks/useFilterListHeader), so this Android header button renders nothing.
import type { FilterMenuProps } from './FilterMenu.shared';

const FilterMenu: React.FC<FilterMenuProps> = () => null;

export default FilterMenu;
