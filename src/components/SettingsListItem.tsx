import React from 'react';
import {
  Switch,
  SwitchProps,
  TextProps,
  TouchableHighlight,
  TouchableHighlightProps,
  View,
  ViewProps,
} from 'react-native';
import {iOSUIKit} from 'react-native-typography';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Layout from '../constants/Layout';
import Text from './Text';
import {useDarkMode} from 'react-native-dark-mode';

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

  const isDarkMode = useDarkMode();

  return (
    <TouchableHighlight
      underlayColor={isDarkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'}
      onPress={onPress}
      style={containerStyle}>
      <View
        style={[
          {
            height: size === 'large' ? 100 : Layout.normalBlockHeight,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: isDarkMode ? 'black' : 'white',
            paddingLeft: 10,
            paddingRight: 20,
          },
          style,
        ]}>
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-start',
            display: 'flex',
          }}>
          <View
            style={{
              justifyContent: 'center',
              alignItems: 'center',
              width: size === 'large' ? 100 : Layout.normalBlockHeight,
            }}>
            {icon}
          </View>
          <Text
            style={[
              {flex: 1, fontSize: iOSUIKit.bodyObject.fontSize},
              textStyle,
            ]}>
            {text}
          </Text>
        </View>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'flex-end',
            alignItems: 'center',
          }}>
          {variant === 'switch' ? (
            <Switch value={switchValue} onValueChange={onSwitchValueChange} />
          ) : (
            <>
              <Text
                style={[
                  {
                    marginRight: 10,
                    fontSize: iOSUIKit.bodyObject.fontSize,
                  },
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
