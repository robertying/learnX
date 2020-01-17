import React from 'react';
import {Text, TextProps, StyleSheet} from 'react-native';
import {useDarkMode} from 'react-native-dark-mode';

const CustomText: React.FunctionComponent<TextProps> = props => {
  const {style, ...restProps} = props;

  const isDarkMode = useDarkMode();

  return (
    <Text
      style={StyleSheet.compose({color: isDarkMode ? 'white' : 'black'}, style)}
      {...restProps}>
      {props.children}
    </Text>
  );
};

export default CustomText;
