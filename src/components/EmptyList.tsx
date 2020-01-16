import React from 'react';
import {Text, View, ViewProps, StyleSheet} from 'react-native';
import {iOSUIKit} from 'react-native-typography';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {getTranslation} from '../helpers/i18n';
import {useDarkMode} from 'react-native-dark-mode';

const EmptyList: React.FC<ViewProps> = props => {
  const {style} = props;

  const isDarkMode = useDarkMode();

  return (
    <View
      style={StyleSheet.compose(
        {
          backgroundColor: isDarkMode ? 'black' : 'white',
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 40,
        },
        style,
      )}>
      <Icon
        name="check-circle"
        color={
          isDarkMode
            ? iOSUIKit.footnoteWhiteObject.color
            : iOSUIKit.footnoteObject.color
        }
        size={40}
      />
      <Text
        style={StyleSheet.compose(
          isDarkMode ? iOSUIKit.footnoteWhite : iOSUIKit.footnote,
          {marginTop: 10},
        )}>
        {getTranslation('emptyContent')}
      </Text>
    </View>
  );
};

export default EmptyList;
