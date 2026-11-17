import type { OverflowMenuProps } from './OverflowMenu.shared';
import HeaderMenu from './HeaderMenu.web';

export type {
  OverflowMenuItem,
  OverflowMenuProps,
} from './OverflowMenu.shared';

/** The header's More button (…) and the menu of its actions. */
const OverflowMenu: React.FC<OverflowMenuProps> = ({
  label,
  items,
  testID,
}) => (
  <HeaderMenu
    label={label}
    icon="more"
    testID={testID}
    items={items.map(item => ({
      id: item.id,
      label: item.label,
      icon: item.icon,
    }))}
    onSelect={id => items.find(item => item.id === id)?.onPress()}
  />
);

export default OverflowMenu;
