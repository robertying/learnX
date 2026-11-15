// The top app bar's filter button and its Material 3 dropdown of filters
// (`HeaderMenu`). The current filter is selected and each one shows its
// count; the button turns tonal while a filter other than All is on.
import { Text } from '@expo/ui/jetpack-compose';
import type { FilterSelection } from 'helpers/filters';
import type { FilterMenuProps } from './FilterMenu.shared';
import HeaderMenu from './HeaderMenu.android';

const FilterMenu: React.FC<FilterMenuProps> = ({
  label,
  options,
  selected,
  onSelectionChange,
}) => (
  <HeaderMenu
    label={label}
    active={selected !== 'all'}
    items={options.map(option => ({
      name: option.name,
      label: option.label,
      icon: option.icon,
      selected: selected === option.name,
      trailing: <Text>{String(option.count)}</Text>,
    }))}
    onSelect={name => onSelectionChange(name as FilterSelection)}
  />
);

export default FilterMenu;
