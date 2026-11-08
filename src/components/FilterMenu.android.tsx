// The filters in a Material 3 dropdown menu, anchored under the top app
// bar's filter button, with the current one checked and each one's count.
import { StyleSheet } from 'react-native';
import MaterialDesignIcons from '@react-native-vector-icons/material-design-icons';
import {
  DropdownMenu,
  Host,
  RNHostView,
  SelectableDropdownMenuItem,
  Spacer,
  Text,
} from '@expo/ui/jetpack-compose';
import { size, testID } from '@expo/ui/jetpack-compose/modifiers';
import { useTheme } from 'theme';
import type { FilterMenuProps } from './FilterMenu';

const FilterMenu: React.FC<FilterMenuProps> = ({
  visible,
  options,
  selected,
  onSelectionChange,
  onDismiss,
}) => {
  const theme = useTheme();

  return (
    <Host
      matchContents
      seedColor={theme.colors.primary}
      style={styles.anchor}
      pointerEvents="box-none"
    >
      <DropdownMenu expanded={visible} onDismissRequest={onDismiss}>
        <DropdownMenu.Trigger>
          <Spacer modifiers={[size(1, 1)]} />
        </DropdownMenu.Trigger>
        <DropdownMenu.Items>
          {options.map((option, index) => (
            <SelectableDropdownMenuItem
              key={option.name}
              selected={selected === option.name}
              shapes={{ index, count: options.length }}
              onClick={() => onSelectionChange(option.name)}
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

const styles = StyleSheet.create({
  // Under the second header button (select, then filter).
  anchor: {
    position: 'absolute',
    top: 0,
    left: 64,
    zIndex: 1,
  },
});

export default FilterMenu;
