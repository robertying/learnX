// The top app bar's filter button with a Material 3 dropdown of options that
// each turn on or off (`HeaderMenu`). The menu stays open as options are
// toggled; options that are on are tinted and checked, and the button turns
// tonal while they aren't at their defaults.
import { RNHostView } from '@expo/ui/jetpack-compose';
import { useMaterialTheme } from 'theme';
import type { ToggleMenuProps } from './ToggleMenu.shared';
import HeaderMenu from './HeaderMenu.android';
import SystemIcon from 'components/SystemIcon';

const ToggleMenu: React.FC<ToggleMenuProps> = ({
  label,
  options,
  active,
  onToggle,
}) => {
  const theme = useMaterialTheme();
  return (
    <HeaderMenu
      label={label}
      active={active}
      stayOpen
      items={options.map(option => ({
        name: option.name,
        label: option.label,
        icon: option.icon,
        selected: option.on,
        // Several can be on at once, so a check marks each one that is,
        // beside the selected tint (as in Google's own apps).
        trailing: option.on ? (
          <RNHostView matchContents>
            <SystemIcon
              name="checked"
              size={24}
              color={theme.colors.onSecondaryContainer}
              testID={`filter-${option.name}-checked`}
            />
          </RNHostView>
        ) : undefined,
      }))}
      onSelect={onToggle}
    />
  );
};

export default ToggleMenu;
