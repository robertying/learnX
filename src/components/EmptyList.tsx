import React from 'react';
import {Text, View, ViewProps, StyleSheet} from 'react-native';
import {iOSUIKit} from 'react-native-typography';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {getTranslation} from '../helpers/i18n';
import {useColorScheme} from 'react-native-appearance';
import Colors from '../constants/Colors';

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
});

const EmptyList: React.FC<ViewProps> = (props) => {
  const {style} = props;

  const colorScheme = useColorScheme();

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: Colors.system('background', colorScheme),
        },
        style,
      ]}>
      <Icon
        name="check-circle"
        color={
          colorScheme === 'dark'
            ? iOSUIKit.footnoteWhiteObject.color
            : iOSUIKit.footnoteObject.color
        }
        size={40}
      />
      <Text
        style={[
          colorScheme === 'dark' ? iOSUIKit.footnoteWhite : iOSUIKit.footnote,
          {marginTop: 10},
        ]}>
        {getTranslation('emptyContent')}
      </Text>
    </View>
  );
};

export default EmptyList;
