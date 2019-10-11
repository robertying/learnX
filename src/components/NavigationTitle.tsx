import React from 'react';
import {Text, TextProps, View, Dimensions} from 'react-native';
import DeviceInfo from '../constants/DeviceInfo';

const NavigationTitle: React.FunctionComponent<
  TextProps & {pushed?: boolean}
> = props => {
  const {style, ...restProps} = props;

  return (
    <View
      style={{
        flex: 1,
        width: Dimensions.get('window').width,
      }}>
      <Text
        numberOfLines={1}
        ellipsizeMode="tail"
        style={[
          {
            width: DeviceInfo.isIPad() ? (props.pushed ? '55%' : '35%') : '60%',
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
