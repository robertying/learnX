import {
  Button,
  Menu,
  MenuItem,
  MenuItemCheckbox,
  MenuItemRadio,
  MenuList,
  MenuPopover,
  MenuTrigger,
  tokens,
  Tooltip,
  type MenuProps,
} from '@fluentui/react-components';
import SystemIcon from 'components/SystemIcon';
import type { SystemIconName } from 'helpers/systemIcons';
import { useTheme } from 'theme';

export interface HeaderMenuItem {
  id: string;
  label: string;
  icon?: SystemIconName;
  /** `radio`: one of the menu is checked; `checkbox`: each turns on or off. */
  type?: 'radio' | 'checkbox';
  checked?: boolean;
  /** A count or detail at the item's end. */
  detail?: string;
}

export interface HeaderMenuProps {
  /** The button's label (its tooltip and accessibility label) */
  label: string;
  icon: SystemIconName;
  items: HeaderMenuItem[];
  /** Shows the button toggled on, when the menu's choices aren't the default. */
  active?: boolean;
  onSelect: (id: string) => void;
  testID?: string;
}

const GROUP = 'choice';

/**
 * A header button that drops a Fluent menu (a Windows menu flyout) from under
 * itself: the filter, More, and other header menus of the Electron app.
 */
const HeaderMenu: React.FC<HeaderMenuProps> = ({
  label,
  icon,
  items,
  active,
  onSelect,
  testID,
}) => {
  const theme = useTheme();
  const checked = items.filter(item => item.checked).map(item => item.id);
  const handleChecked: MenuProps['onCheckedValueChange'] = (
    _event,
    { checkedItems },
  ) => {
    // A radio group reports its new choice; a checkbox, the set after the
    // click: the item that changed is the one toggled.
    const toggled =
      checkedItems.find(id => !checked.includes(id)) ??
      checked.find(id => !checkedItems.includes(id));
    if (toggled) {
      onSelect(toggled);
    }
  };
  const itemIcon = (item: HeaderMenuItem) =>
    item.icon ? (
      <SystemIcon name={item.icon} size={16} color={theme.colors.onSurface} />
    ) : undefined;
  return (
    <Menu
      checkedValues={{ [GROUP]: checked }}
      onCheckedValueChange={handleChecked}
      hasIcons={items.some(item => item.icon)}
      hasCheckmarks={items.some(item => item.type)}
    >
      <MenuTrigger disableButtonEnhancement>
        <Tooltip content={label} relationship="label" withArrow>
          <Button
            appearance={active ? 'primary' : 'subtle'}
            shape={active ? 'circular' : 'rounded'}
            data-testid={testID}
            icon={
              <SystemIcon
                name={icon}
                size={20}
                color={
                  active
                    ? tokens.colorNeutralForegroundOnBrand
                    : theme.colors.onSurface
                }
              />
            }
          />
        </Tooltip>
      </MenuTrigger>
      <MenuPopover>
        <MenuList>
          {items.map(item => {
            const props = {
              icon: itemIcon(item),
              secondaryContent: item.detail,
              'data-testid': testID ? `${testID}-${item.id}` : undefined,
            };
            return item.type === 'radio' ? (
              <MenuItemRadio
                key={item.id}
                {...props}
                name={GROUP}
                value={item.id}
              >
                {item.label}
              </MenuItemRadio>
            ) : item.type === 'checkbox' ? (
              <MenuItemCheckbox
                key={item.id}
                {...props}
                name={GROUP}
                value={item.id}
              >
                {item.label}
              </MenuItemCheckbox>
            ) : (
              <MenuItem
                key={item.id}
                {...props}
                onClick={() => onSelect(item.id)}
              >
                {item.label}
              </MenuItem>
            );
          })}
        </MenuList>
      </MenuPopover>
    </Menu>
  );
};

export default HeaderMenu;
