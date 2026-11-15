// A top app bar button with a Material 3 dropdown under it, in one Compose
// view, so the menu anchors to the button itself. Each item has its icon and
// is tinted while selected; the button turns tonal while `active`. The filter
// menu (`FilterMenu`) and the menu of toggles (`ToggleMenu`) are both this.
import { useState, type ReactNode } from 'react';
import {
  DropdownMenu,
  FilledTonalIconButton,
  Icon,
  IconButton,
  RNHostView,
  SelectableDropdownMenuItem,
  Text,
} from '@expo/ui/jetpack-compose';
import { testID } from '@expo/ui/jetpack-compose/modifiers';
import { iconDrawables } from 'assets/icons';
import { systemIcons, type SystemIconName } from 'helpers/systemIcons';
import { useMaterialTheme } from 'theme';
import SystemIcon from 'components/SystemIcon';
import ThemedHost from 'components/ThemedHost';

export interface HeaderMenuItem {
  name: string;
  label: string;
  icon: SystemIconName;
  selected: boolean;
  /** At the item's end, such as a count. */
  trailing?: ReactNode;
}

export interface HeaderMenuProps {
  /** The button's accessibility label */
  label: string;
  items: HeaderMenuItem[];
  /** Draws the button filled tonal. */
  active: boolean;
  onSelect: (name: string) => void;
  /** Keeps the menu open after a pick, for options that each turn on or off. */
  stayOpen?: boolean;
}

const HeaderMenu: React.FC<HeaderMenuProps> = ({
  label,
  items,
  active,
  onSelect,
  stayOpen,
}) => {
  const theme = useMaterialTheme();
  const [expanded, setExpanded] = useState(false);
  // Compose's expressive menu marks the selected item with the tertiary
  // container, which the brand seed turns peach; use the filled tonal
  // button's secondary container instead.
  const selectedColors = {
    selectedContainerColor: theme.colors.secondaryContainer,
    selectedTextColor: theme.colors.onSecondaryContainer,
    selectedLeadingIconColor: theme.colors.onSecondaryContainer,
    selectedTrailingContentColor: theme.colors.onSecondaryContainer,
  };

  const Button = active ? FilledTonalIconButton : IconButton;

  return (
    <ThemedHost matchContents>
      <DropdownMenu
        expanded={expanded}
        onDismissRequest={() => setExpanded(false)}
      >
        <DropdownMenu.Trigger>
          <Button
            onClick={() => setExpanded(true)}
            modifiers={[testID('filter')]}
          >
            {/* The same icon and size as the other header IconButtons. */}
            <Icon
              source={iconDrawables[systemIcons.filter.android]}
              size={24}
              contentDescription={label}
            />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Items>
          {items.map((item, index) => (
            <SelectableDropdownMenuItem
              key={item.name}
              selected={item.selected}
              shapes={{ index, count: items.length }}
              colors={selectedColors}
              onClick={() => {
                if (!stayOpen) {
                  setExpanded(false);
                }
                onSelect(item.name);
              }}
              modifiers={[testID(`filter-${item.name}`)]}
            >
              <SelectableDropdownMenuItem.LeadingIcon>
                <RNHostView matchContents>
                  <SystemIcon
                    name={item.icon}
                    size={24}
                    color={
                      item.selected
                        ? theme.colors.onSecondaryContainer
                        : theme.colors.onSurfaceVariant
                    }
                  />
                </RNHostView>
              </SelectableDropdownMenuItem.LeadingIcon>
              <SelectableDropdownMenuItem.Text>
                <Text>{item.label}</Text>
              </SelectableDropdownMenuItem.Text>
              {item.trailing ? (
                <SelectableDropdownMenuItem.TrailingContent>
                  {item.trailing}
                </SelectableDropdownMenuItem.TrailingContent>
              ) : null}
            </SelectableDropdownMenuItem>
          ))}
        </DropdownMenu.Items>
      </DropdownMenu>
    </ThemedHost>
  );
};

export default HeaderMenu;
