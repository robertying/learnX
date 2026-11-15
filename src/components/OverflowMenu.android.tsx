// The top app bar's overflow button (⋮) and its Material 3 dropdown of the
// actions that don't fit as buttons of their own, in one Compose view, so the
// menu anchors to the button itself.
import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuItem,
  Icon,
  IconButton,
  RNHostView,
  Text,
} from '@expo/ui/jetpack-compose';
import { testID } from '@expo/ui/jetpack-compose/modifiers';
import { iconDrawables } from 'assets/icons';
import { systemIcons } from 'helpers/systemIcons';
import { useMaterialTheme } from 'theme';
import type { OverflowMenuProps } from './OverflowMenu.shared';
import SystemIcon from 'components/SystemIcon';
import ThemedHost from 'components/ThemedHost';

export type {
  OverflowMenuItem,
  OverflowMenuProps,
} from './OverflowMenu.shared';

const OverflowMenu: React.FC<OverflowMenuProps> = ({
  label,
  items,
  testID: id,
}) => {
  const theme = useMaterialTheme();
  const [expanded, setExpanded] = useState(false);

  return (
    <ThemedHost matchContents>
      <DropdownMenu
        expanded={expanded}
        onDismissRequest={() => setExpanded(false)}
      >
        <DropdownMenu.Trigger>
          <IconButton
            onClick={() => setExpanded(true)}
            modifiers={id ? [testID(id)] : undefined}
          >
            {/* The same icon and size as the other header IconButtons. */}
            <Icon
              source={iconDrawables[systemIcons.more.android]}
              size={24}
              contentDescription={label}
            />
          </IconButton>
        </DropdownMenu.Trigger>
        <DropdownMenu.Items>
          {items.map(item => (
            <DropdownMenuItem
              key={item.id}
              onClick={() => {
                setExpanded(false);
                item.onPress();
              }}
              modifiers={[testID(item.id)]}
            >
              <DropdownMenuItem.LeadingIcon>
                <RNHostView matchContents>
                  <SystemIcon
                    testID={`icon-${item.icon}`}
                    name={item.icon}
                    size={24}
                    color={theme.colors.onSurfaceVariant}
                  />
                </RNHostView>
              </DropdownMenuItem.LeadingIcon>
              <DropdownMenuItem.Text>
                <Text>{item.label}</Text>
              </DropdownMenuItem.Text>
            </DropdownMenuItem>
          ))}
        </DropdownMenu.Items>
      </DropdownMenu>
    </ThemedHost>
  );
};

export default OverflowMenu;
