// The top app bar's filter button and its Material 3 dropdown of filters, in
// one Compose view, so the menu anchors to the button itself. The current
// filter is checked and each one shows its count; the button turns tonal
// while a filter other than All is on.
import { useState } from 'react';
import MaterialDesignIcons from '@react-native-vector-icons/material-design-icons';
import {
  DropdownMenu,
  FilledTonalIconButton,
  Host,
  IconButton,
  RNHostView,
  SelectableDropdownMenuItem,
  Text,
} from '@expo/ui/jetpack-compose';
import { semantics, size, testID } from '@expo/ui/jetpack-compose/modifiers';
import { useTheme } from 'theme';
import type { FilterMenuProps } from './FilterMenu.shared';

const FilterMenu: React.FC<FilterMenuProps> = ({
  label,
  options,
  selected,
  onSelectionChange,
}) => {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);

  const Button = selected === 'all' ? IconButton : FilledTonalIconButton;

  return (
    <Host matchContents seedColor={theme.colors.primary}>
      <DropdownMenu
        expanded={expanded}
        onDismissRequest={() => setExpanded(false)}
      >
        <DropdownMenu.Trigger>
          <Button
            onClick={() => setExpanded(true)}
            // The size of the app's other header buttons.
            modifiers={[
              size(32, 32),
              semantics({ contentDescription: label }),
              testID('filter'),
            ]}
          >
            <RNHostView matchContents>
              <MaterialDesignIcons
                name="filter-variant"
                size={20}
                color={
                  selected === 'all'
                    ? theme.colors.onSurfaceVariant
                    : theme.colors.onSecondaryContainer
                }
              />
            </RNHostView>
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Items>
          {options.map((option, index) => (
            <SelectableDropdownMenuItem
              key={option.name}
              selected={selected === option.name}
              shapes={{ index, count: options.length }}
              onClick={() => {
                setExpanded(false);
                onSelectionChange(option.name);
              }}
              modifiers={[testID(`filter-${option.name}`)]}
            >
              <SelectableDropdownMenuItem.LeadingIcon>
                <RNHostView matchContents>
                  <MaterialDesignIcons
                    name={option.materialIcon}
                    size={24}
                    color={
                      selected === option.name
                        ? theme.colors.onSecondaryContainer
                        : theme.colors.onSurfaceVariant
                    }
                  />
                </RNHostView>
              </SelectableDropdownMenuItem.LeadingIcon>
              <SelectableDropdownMenuItem.Text>
                <Text>{option.label}</Text>
              </SelectableDropdownMenuItem.Text>
              <SelectableDropdownMenuItem.TrailingContent>
                <Text>{String(option.count)}</Text>
              </SelectableDropdownMenuItem.TrailingContent>
            </SelectableDropdownMenuItem>
          ))}
        </DropdownMenu.Items>
      </DropdownMenu>
    </Host>
  );
};

export default FilterMenu;
