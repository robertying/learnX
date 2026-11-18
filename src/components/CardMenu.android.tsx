import { StyleSheet } from 'react-native';
import {
  DropdownMenu,
  DropdownMenuItem,
  RNHostView,
  Spacer,
  Text,
} from '@expo/ui/jetpack-compose';
import { size, testID } from '@expo/ui/jetpack-compose/modifiers';
import type { CardMenuProps } from './CardMenu.shared';
import SystemIcon from 'components/SystemIcon';
import ThemedHost from 'components/ThemedHost';
import { useMaterialTheme } from 'theme';

// A clipped popup loses the status bar offset near the bottom of the screen.
const popupProperties = { clippingEnabled: false };

/**
 * The card's actions in a Material 3 dropdown menu, opened by a long press and
 * anchored where the finger is (as `View.showContextMenu(x, y)`), each with
 * its icon as in the header's filter menu. Anchored at the card's bottom edge,
 * it would open over the next card and read as that card's menu.
 */
const CardMenu: React.FC<CardMenuProps> = ({
  visible,
  actions,
  onAction,
  onDismiss,
  anchor,
}) => {
  const theme = useMaterialTheme();
  return (
    <ThemedHost
      testID="card-menu-anchor"
      matchContents
      style={[
        styles.anchor,
        anchor ? { left: anchor.x, top: anchor.y } : styles.defaultAnchor,
      ]}
      pointerEvents="box-none"
    >
      <DropdownMenu
        expanded={visible}
        onDismissRequest={onDismiss}
        properties={popupProperties}
      >
        <DropdownMenu.Trigger>
          <Spacer modifiers={[size(1, 1)]} />
        </DropdownMenu.Trigger>
        <DropdownMenu.Items>
          {actions.map(action => (
            <DropdownMenuItem
              key={action.key}
              modifiers={[testID(action.testID)]}
              onClick={() => onAction(action)}
            >
              <DropdownMenuItem.LeadingIcon>
                <RNHostView matchContents>
                  <SystemIcon
                    testID={`icon-${action.icon}`}
                    name={action.icon}
                    size={24}
                    color={theme.colors.onSurfaceVariant}
                  />
                </RNHostView>
              </DropdownMenuItem.LeadingIcon>
              <DropdownMenuItem.Text>
                <Text>{action.label}</Text>
              </DropdownMenuItem.Text>
            </DropdownMenuItem>
          ))}
        </DropdownMenu.Items>
      </DropdownMenu>
    </ThemedHost>
  );
};

const styles = StyleSheet.create({
  anchor: {
    position: 'absolute',
  },
  // Without a touch point: the card's top right, over the card itself.
  defaultAnchor: {
    right: 16,
    top: 0,
  },
});

export default CardMenu;
