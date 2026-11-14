// The top app bar's filter button with a Material 3 dropdown of options that
// each turn on or off, in one Compose view, so the menu anchors to the button.
// The menu stays open as options are toggled; options that are on are tinted
// and checked, and the button turns tonal while they aren't at their defaults.
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
import type { ToggleMenuProps } from './ToggleMenu.shared';
import SystemIcon from 'components/SystemIcon';
import ThemedHost from 'components/ThemedHost';

const ToggleMenu: React.FC<ToggleMenuProps> = ({
  label,
  options,
  active,
  onToggle,
}) => {
  const theme = useMaterialTheme();
  const [expanded, setExpanded] = useState(false);
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
              selected={option.on}
              shapes={{ index, count: options.length }}
              colors={selectedColors}
              onClick={() => onToggle(option.name)}
              modifiers={[testID(`filter-${option.name}`)]}
            >
              <SelectableDropdownMenuItem.LeadingIcon>
                <RNHostView matchContents>
                  <SystemIcon
                    name={option.icon}
                    size={24}
                    color={
                      option.on
                        ? theme.colors.onSecondaryContainer
                        : theme.colors.onSurfaceVariant
                    }
                  />
                </RNHostView>
              </SelectableDropdownMenuItem.LeadingIcon>
              <SelectableDropdownMenuItem.Text>
                <Text>{option.label}</Text>
              </SelectableDropdownMenuItem.Text>
              {/* Several can be on at once, so a check marks each one that
                  is, beside the selected tint (as in Google's own apps). */}
              {option.on ? (
                <SelectableDropdownMenuItem.TrailingContent>
                  <RNHostView matchContents>
                    <SystemIcon
                      name="checked"
                      size={24}
                      color={theme.colors.onSecondaryContainer}
                      testID={`filter-${option.name}-checked`}
                    />
                  </RNHostView>
                </SelectableDropdownMenuItem.TrailingContent>
              ) : null}
            </SelectableDropdownMenuItem>
          ))}
        </DropdownMenu.Items>
      </DropdownMenu>
    </ThemedHost>
  );
};

export default ToggleMenu;
