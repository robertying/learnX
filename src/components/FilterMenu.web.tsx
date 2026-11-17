import type { FilterSelection } from 'helpers/filters';
import type { FilterMenuProps } from './FilterMenu.shared';
import HeaderMenu from './HeaderMenu.web';

/**
 * The header's filter button and its menu of filters, the current one
 * checked and each one's count beside it; the button shows toggled on while
 * a filter other than All is.
 */
const FilterMenu: React.FC<FilterMenuProps> = ({
  label,
  options,
  selected,
  onSelectionChange,
}) => (
  <HeaderMenu
    label={label}
    icon="filter"
    testID="filter"
    active={selected !== 'all'}
    items={options.map(option => ({
      id: option.name,
      label: option.label,
      icon: option.icon,
      detail: String(option.count),
      type: 'radio',
      checked: selected === option.name,
    }))}
    onSelect={name => onSelectionChange(name as FilterSelection)}
  />
);

export default FilterMenu;
