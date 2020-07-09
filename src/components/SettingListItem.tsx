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
  ActivityIndicator,
  Platform,
  TouchableNativeFeedback,
  TextInput,
  TextInputProperties,
} from 'react-native';
import {iOSUIKit} from 'react-native-typography';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Layout from '../constants/Layout';
import {useColorScheme} from 'react-native-appearance';
import Colors from '../constants/Colors';

export interface ISettingListItemProps {
  icon?: React.ReactNode;
  size?: 'small' | 'large';
  text?: string;
  textStyle?: TextProps['style'];
  secondaryText?: string;
  secondaryTextStyle?: TextProps['style'];
  variant: 'switch' | 'arrow' | 'input' | 'none';
  switchValue?: boolean;
  onSwitchValueChange?: SwitchProps['onValueChange'];
  onPress?: TouchableHighlightProps['onPress'];
  style?: ViewProps['style'];
  containerStyle?: TouchableHighlightProps['style'];
  switchDisabled?: boolean;
  loading?: boolean;
  inputValue?: string;
  onInputValueChange?: TextInputProperties['onChangeText'];
  keyboardType?: TextInputProperties['keyboardType'];
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

const SettingListItem: React.FunctionComponent<ISettingListItemProps> = (
  props,
) => {
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
    switchDisabled,
    loading,
    inputValue,
    onInputValueChange,
    keyboardType,
  } = props;

  const colorScheme = useColorScheme();

  const children = (
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
        {loading ? (
          <ActivityIndicator
            animating
            color={Platform.OS === 'android' ? Colors.theme : undefined}
          />
        ) : variant === 'switch' ? (
          <Switch
            disabled={switchDisabled}
            value={switchValue}
            onValueChange={onSwitchValueChange}
          />
        ) : variant === 'input' ? (
          <TextInput
            style={{
              color: Colors.system('gray', colorScheme),
              fontSize: 17,
              width: 50,
            }}
            value={inputValue}
            onChangeText={onInputValueChange}
            keyboardType={keyboardType}
          />
        ) : (
          <>
            <Text
              style={[
                {color: Colors.system('gray', colorScheme)},
                styles.rightText,
                secondaryTextStyle,
              ]}>
              {secondaryText}
            </Text>
            {variant === 'arrow' ? (
              <Icon name="keyboard-arrow-right" size={20} color="lightgrey" />
            ) : null}
          </>
        )}
      </View>
    </View>
  );

  return Platform.OS === 'ios' ? (
    <TouchableHighlight
      underlayColor={Colors.system('foreground', colorScheme)}
      onPress={onPress}
      style={containerStyle}>
      {children}
    </TouchableHighlight>
  ) : (
    <TouchableNativeFeedback
      onPress={onPress}
      background={TouchableNativeFeedback.Ripple(
        colorScheme === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
        false,
      )}
      style={containerStyle}>
      {children}
    </TouchableNativeFeedback>
  );
};

export default SettingListItem;
