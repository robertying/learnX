import {
  ActivityIndicator,
  Image,
  ImageSourcePropType,
  StyleSheet,
  View,
  ViewProps,
  TextInput,
} from 'react-native';
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons';
import Badge from 'components/Badge';
import Icon, {
  MaterialIconsIconName,
} from '@react-native-vector-icons/material-icons';
import Touchable from './Touchable';
import Switch from 'components/Switch';
import { Text } from 'components/Text';
import { useTheme } from 'theme';

export interface TableCellProps extends ViewProps {
  type: 'none' | 'switch' | 'arrow' | 'input';
  onPress?: () => void;
  primaryText: string;
  secondaryText?: string;
  iconName?: MaterialIconsIconName;
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

  return (
    <Touchable
      style={[{ backgroundColor: theme.colors.surface }, restProps.style]}
      onPress={onPress}
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
            <Icon
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
        {type === 'switch' && !loading ? (
          <View>
            <Switch
              disabled={switchDisabled}
              value={!!switchValue}
              accessibilityLabel={primaryText}
              onValueChange={value => onSwitchValueChange?.(value)}
            />
          </View>
        ) : null}
        {type === 'arrow' ? (
          <Icon name="keyboard-arrow-right" size={21} color="grey" />
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
