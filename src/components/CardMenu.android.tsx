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
 * anchored at the card's bottom right, each with its icon as in the header's
 * filter menu.
 */
const CardMenu: React.FC<CardMenuProps> = ({
  visible,
  actions,
  onAction,
  onDismiss,
}) => {
  const theme = useMaterialTheme();
  return (
    <ThemedHost matchContents style={styles.anchor} pointerEvents="box-none">
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
    right: 16,
    bottom: 0,
  },
});

export default CardMenu;
