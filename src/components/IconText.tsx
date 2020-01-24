import React from 'react';
import {View, StyleSheet, Text} from 'react-native';
import {iOSUIKit} from 'react-native-typography';
import {IconProps} from 'react-native-vector-icons/Icon';
import Icon from 'react-native-vector-icons/MaterialIcons';

export type IIconTextProps = IconProps & {
  text: string;
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const IconText: React.FunctionComponent<IIconTextProps> = props => {
  return (
    <View style={styles.root}>
      <Icon size={iOSUIKit.bodyObject.fontSize} {...props} />
      <Text
        style={[
          iOSUIKit.body,
          {
            marginLeft: 5,
            color: props.color,
          },
        ]}>
        {props.text}
      </Text>
    </View>
  );
};

export default IconText;
