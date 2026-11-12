// The top app bar's filter button and its Material 3 dropdown of filters, in
// one Compose view, so the menu anchors to the button itself. The current
// filter is checked and each one shows its count; the button turns tonal
// while a filter other than All is on.
import { useState } from 'react';
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
import { systemIcons } from 'helpers/systemIcons';
import { useMaterialTheme } from 'theme';
import type { FilterMenuProps } from './FilterMenu.shared';
import SystemIcon from 'components/SystemIcon';
import ThemedHost from 'components/ThemedHost';

const FilterMenu: React.FC<FilterMenuProps> = ({
  label,
  options,
  selected,
  onSelectionChange,
}) => {
  const theme = useMaterialTheme();
  const [expanded, setExpanded] = useState(false);
  const selectedColors = {
    selectedContainerColor: theme.colors.secondaryContainer,
    selectedTextColor: theme.colors.onSecondaryContainer,
    selectedLeadingIconColor: theme.colors.onSecondaryContainer,
    selectedTrailingContentColor: theme.colors.onSecondaryContainer,
  };

  const Button = selected === 'all' ? IconButton : FilledTonalIconButton;

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
          {options.map((option, index) => (
            <SelectableDropdownMenuItem
              key={option.name}
              selected={selected === option.name}
              shapes={{ index, count: options.length }}
              // Compose's expressive menu marks the selected item with the
              // tertiary container, which the brand seed turns peach; use the
              // filled tonal button's secondary container instead.
              colors={selectedColors}
              onClick={() => {
                setExpanded(false);
                onSelectionChange(option.name);
              }}
              modifiers={[testID(`filter-${option.name}`)]}
            >
              <SelectableDropdownMenuItem.LeadingIcon>
                <RNHostView matchContents>
                  <SystemIcon
                    name={option.icon}
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
    </ThemedHost>
  );
};

export default FilterMenu;
