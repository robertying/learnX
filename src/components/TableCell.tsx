import {
  AccessibilityActionEvent,
  ActivityIndicator,
  Image,
  ImageSourcePropType,
  StyleSheet,
  View,
  ViewProps,
  TextInput,
} from 'react-native';
import MaterialCommunityIcons, {
  type MaterialDesignIconsIconName,
} from '@react-native-vector-icons/material-design-icons';
import Badge from 'components/Badge';
import Touchable from './Touchable';
import Switch from 'components/Switch';
import { Text } from 'components/Text';
import { useTheme } from 'theme';

export interface TableCellProps extends ViewProps {
  type: 'none' | 'switch' | 'arrow' | 'input';
  onPress?: () => void;
  primaryText: string;
  secondaryText?: string;
  iconName?: MaterialDesignIconsIconName;
  imageSrc?: ImageSourcePropType;
  imageAlt?: string;
  switchDisabled?: boolean;
  switchValue?: boolean;
  onSwitchValueChange?: (value: boolean) => void;
  inputValue?: string;
  onInputValueChange?: (value: string) => void;
  loading?: boolean;
  badge?: boolean;
}

const TableCell: React.FC<React.PropsWithChildren<TableCellProps>> = ({
  type,
  onPress,
  primaryText,
  secondaryText,
  iconName,
  imageAlt,
  imageSrc,
  switchDisabled,
  switchValue,
  onSwitchValueChange,
  inputValue,
  onInputValueChange,
  loading,
  badge,
  ...restProps
}) => {
  const theme = useTheme();

  // The row is one accessibility element (Touchable is accessible), which
  // hides the switch inside it from VoiceOver, TalkBack and the Mac
  // accessibility tree. So a switch row is the switch: it reads as one and
  // toggles on activate. It also toggles when the row is pressed, because on
  // Mac Catalyst an accessibility press (AXPress) presses the row rather than
  // sending activate.
  const isSwitch = type === 'switch' && !loading;
  const toggleSwitch = () => {
    if (!switchDisabled) {
      onSwitchValueChange?.(!switchValue);
    }
  };
  const switchAccessibility = isSwitch
    ? {
        accessibilityRole: 'switch' as const,
        accessibilityLabel: primaryText,
        accessibilityState: {
          checked: !!switchValue,
          disabled: !!switchDisabled,
        },
        accessibilityActions: [{ name: 'activate' }],
        onAccessibilityAction: (event: AccessibilityActionEvent) => {
          if (event.nativeEvent.actionName === 'activate') {
            toggleSwitch();
          }
        },
      }
    : undefined;

  return (
    <Touchable
      style={[{ backgroundColor: theme.colors.surface }, restProps.style]}
      onPress={onPress ?? (isSwitch ? toggleSwitch : undefined)}
      {...switchAccessibility}
    >
      <View
        {...restProps}
        style={[
          styles.root,
          {
            paddingVertical: imageAlt ? 16 : 2,
          },
        ]}
      >
        {imageAlt ? (
          <View
            style={[
              styles.avatar,
              styles.icon,
              !imageSrc && { backgroundColor: theme.colors.primary },
            ]}
          >
            {imageSrc ? (
              <Image style={styles.avatarImage} source={imageSrc} />
            ) : (
              <MaterialCommunityIcons
                name="account"
                size={48 * 0.6}
                color={theme.colors.background}
              />
            )}
          </View>
        ) : null}
        {iconName ? (
          <View style={{ position: 'relative' }}>
            <MaterialCommunityIcons
              style={styles.icon}
              name={iconName}
              size={21}
              color={theme.colors.onSurface}
            />
            {badge && (
              <Badge
                style={{
                  position: 'absolute',
                  backgroundColor: 'red',
                }}
                size={10}
              />
            )}
          </View>
        ) : null}
        <Text
          style={[styles.primaryText, imageAlt ? styles.bigText : undefined]}
        >
          {primaryText}
        </Text>
        <Text style={styles.secondaryText}>{secondaryText}</Text>
        {isSwitch ? (
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <Switch
              disabled={switchDisabled}
              value={!!switchValue}
              onValueChange={value => onSwitchValueChange?.(value)}
            />
          </View>
        ) : null}
        {type === 'arrow' ? (
          <MaterialCommunityIcons name="chevron-right" size={21} color="grey" />
        ) : null}
        {type === 'input' ? (
          <TextInput
            keyboardType="number-pad"
            style={[styles.input, { color: theme.colors.onSurface }]}
            value={inputValue}
            onChangeText={onInputValueChange}
          />
        ) : null}
        {loading ? <ActivityIndicator color={theme.colors.primary} /> : null}
      </View>
    </Touchable>
  );
};

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 2,
    minHeight: 52,
  },
  icon: {
    marginRight: 8,
  },
  primaryText: {
    fontSize: 17,
    flex: 1,
    marginHorizontal: 8,
  },
  bigText: {
    fontSize: 19,
    fontWeight: '600',
  },
  secondaryText: {
    fontSize: 15,
    color: 'grey',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  input: {
    fontSize: 17,
    minWidth: 24,
  },
});

export default TableCell;
