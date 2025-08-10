import { StyleSheet, View, ViewProps, TextInput } from 'react-native';
import {
  Avatar,
  Text,
  useTheme,
  Switch,
  Badge,
  ActivityIndicator,
  AvatarImageProps,
} from 'react-native-paper';
import Icon from '@react-native-vector-icons/material-icons';
import Touchable from './Touchable';

export interface TableCellProps extends ViewProps {
  type: 'none' | 'switch' | 'arrow' | 'input';
  onPress?: () => void;
  primaryText: string;
  secondaryText?: string;
  iconName?: string;
  imageSrc?: AvatarImageProps['source'];
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
        {imageAlt && imageSrc ? (
          <Avatar.Image
            size={48}
            style={[styles.avatar, styles.icon]}
            source={imageSrc}
          />
        ) : imageAlt ? (
          <Avatar.Icon
            style={styles.icon}
            size={48}
            icon="account"
            color={theme.colors.background}
          />
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
                visible
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
          <Switch
            disabled={switchDisabled}
            value={switchValue}
            onValueChange={onSwitchValueChange}
          />
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
        {loading ? <ActivityIndicator /> : null}
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
    minHeight: 44,
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
    backgroundColor: 'transparent',
  },
  input: {
    fontSize: 17,
    minWidth: 24,
  },
});

export default TableCell;
