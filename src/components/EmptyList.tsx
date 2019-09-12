import React from 'react';
import {Text, View} from 'react-native';
import {iOSUIKit} from 'react-native-typography';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {getTranslation} from '../helpers/i18n';
import {useDarkMode} from 'react-native-dark-mode';

const EmptyList: React.FunctionComponent = () => {
  const isDarkMode = useDarkMode();

  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 40,
      }}>
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
        style={[
          isDarkMode ? iOSUIKit.footnoteWhite : iOSUIKit.footnote,
          {marginTop: 10},
        ]}>
        {getTranslation('emptyContent')}
      </Text>
    </View>
  );
};

export default EmptyList;
