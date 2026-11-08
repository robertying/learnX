import { Platform, StyleSheet, View } from 'react-native';
import { Host, Icon } from '@expo/ui';
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons';
import { useTheme } from 'theme';

export interface SelectionMarkProps {
  checked: boolean;
}

/**
 * The mark on a card in selection mode. It only shows the state: the card
 * takes the tap. iOS, iPadOS and Mac draw the system's selection circle (SF
 * Symbols `circle` / `checkmark.circle.fill`, as in Mail and Files); Android
 * draws the Material checkbox.
 */
const SelectionMark: React.FC<SelectionMarkProps> = ({ checked }) => {
  const theme = useTheme();
  const color = checked ? theme.colors.primary : theme.colors.outline;

  if (Platform.OS === 'ios') {
    return (
      <View style={styles.ios} pointerEvents="none">
        <Host matchContents>
          <Icon
            name={checked ? 'checkmark.circle.fill' : 'circle'}
            size={22}
            color={color}
          />
        </Host>
      </View>
    );
  }

  return (
    <MaterialCommunityIcons
      style={styles.android}
      name={checked ? 'checkbox-marked' : 'checkbox-blank-outline'}
      size={24}
      color={checked ? theme.colors.primary : theme.colors.onSurfaceVariant}
    />
  );
};

const styles = StyleSheet.create({
  ios: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  android: {
    padding: 6,
  },
});

export default SelectionMark;
