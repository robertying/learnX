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
  readonly icon?: React.ReactNode;
  readonly size?: 'small' | 'large';
  readonly text?: string;
  readonly textStyle?: TextProps['style'];
  readonly secondaryText?: string;
  readonly secondaryTextStyle?: TextProps['style'];
  readonly variant: 'switch' | 'arrow' | 'none';
  readonly switchValue?: boolean;
  readonly onSwitchValueChange?: SwitchProps['onValueChange'];
  readonly onPress?: TouchableHighlightProps['onPress'];
  readonly style?: ViewProps['style'];
  readonly containerStyle?: TouchableHighlightProps['style'];
}

const SettingsListItem: React.FunctionComponent<
  ISettingsListItemProps
> = props => {
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
      underlayColor={isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.4)'}
      onPress={onPress}
      style={containerStyle}>
      <View
        style={[
          {
            height: size === 'large' ? 100 : Layout.normalBlockHeight,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'white',
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
          }}>
          <View
            style={{
              justifyContent: 'center',
              alignItems: 'center',
              width: size === 'large' ? 100 : Layout.normalBlockHeight,
            }}>
            {icon}
          </View>
          <Text style={[{fontSize: iOSUIKit.bodyObject.fontSize}, textStyle]}>
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
