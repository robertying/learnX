import React from 'react';
import {
  Switch,
  SwitchProps,
  TextProps,
  TouchableHighlight,
  TouchableHighlightProps,
  View,
  ViewProps,
  StyleSheet,
  Text,
} from 'react-native';
import {iOSUIKit} from 'react-native-typography';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Layout from '../constants/Layout';
import {useColorScheme} from 'react-native-appearance';
import Colors from '../constants/Colors';

export interface ISettingsListItemProps {
  icon?: React.ReactNode;
  size?: 'small' | 'large';
  text?: string;
  textStyle?: TextProps['style'];
  secondaryText?: string;
  secondaryTextStyle?: TextProps['style'];
  variant: 'switch' | 'arrow' | 'none';
  switchValue?: boolean;
  onSwitchValueChange?: SwitchProps['onValueChange'];
  onPress?: TouchableHighlightProps['onPress'];
  style?: ViewProps['style'];
  containerStyle?: TouchableHighlightProps['style'];
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 10,
    paddingRight: 20,
  },
  left: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    display: 'flex',
  },
  right: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  leftView: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  leftText: {
    flex: 1,
    fontSize: iOSUIKit.bodyObject.fontSize,
  },
  rightText: {
    marginRight: 10,
    fontSize: iOSUIKit.bodyObject.fontSize,
  },
});

const SettingsListItem: React.FunctionComponent<ISettingsListItemProps> = props => {
  const {
    variant,
    icon,
    onSwitchValueChange,
    onPress,
    text,
    secondaryText,
    style,
    containerStyle,
    switchValue,
    size,
    textStyle,
    secondaryTextStyle,
  } = props;

  const colorScheme = useColorScheme();

  return (
    <TouchableHighlight
      underlayColor={
        colorScheme === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'
      }
      onPress={onPress}
      style={containerStyle}>
      <View
        style={[
          styles.root,
          {
            height: size === 'large' ? 100 : Layout.normalBlockHeight,
            backgroundColor: Colors.system('background', colorScheme),
          },
          style,
        ]}>
        <View style={styles.left}>
          <View
            style={[
              styles.leftView,
              {width: size === 'large' ? 100 : Layout.normalBlockHeight},
            ]}>
            {icon}
          </View>
          <Text
            style={[
              {color: Colors.system('foreground', colorScheme)},
              styles.leftText,
              textStyle,
            ]}>
            {text}
          </Text>
        </View>
        <View style={styles.right}>
          {variant === 'switch' ? (
            <Switch value={switchValue} onValueChange={onSwitchValueChange} />
          ) : (
            <>
              <Text
                style={[
                  {color: Colors.system('foreground', colorScheme)},
                  styles.rightText,
                  secondaryTextStyle,
                ]}>
                {secondaryText}
              </Text>
              {variant === 'arrow' ? (
                <Ionicons
                  name="ios-arrow-forward"
                  size={20}
                  color="lightgrey"
                />
              ) : null}
            </>
          )}
        </View>
      </View>
    </TouchableHighlight>
  );
};

export default SettingsListItem;
