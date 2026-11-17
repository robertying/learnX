import type { ToggleMenuProps } from './ToggleMenu.shared';
import HeaderMenu from './HeaderMenu.web';

/**
 * The header's filter button with a menu of options that each turn on
 * or off, checked while on; the button shows toggled on while they aren't at
 * their defaults.
 */
const ToggleMenu: React.FC<ToggleMenuProps> = ({
  label,
  options,
  active,
  onToggle,
}) => (
  <HeaderMenu
    label={label}
    icon="filter"
    testID="filter"
    active={active}
    items={options.map(option => ({
      id: option.name,
      label: option.label,
      icon: option.icon,
      type: 'checkbox',
      checked: option.on,
    }))}
    onSelect={onToggle}
  />
);

export default ToggleMenu;
