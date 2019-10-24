import React from 'react';
import {TextProps, View} from 'react-native';
import Text from './Text';

const NavigationTitle: React.FunctionComponent<TextProps> = props => {
  const {style, ...restProps} = props;
  console.log(style);
  return (
    <View
      style={{
        flex: 1,
      }}>
      <Text
        numberOfLines={1}
        ellipsizeMode="tail"
        style={[
          {
            fontSize: 17,
            fontWeight: '500',
          },
          style,
        ]}
        {...restProps}>
        {props.children}
      </Text>
    </View>
  );
};

export default NavigationTitle;
