import React from 'react';
import {StyleSheet, View} from 'react-native';
import {Text, useTheme} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Styles from 'constants/Styles';

const Empty: React.FC = () => {
  const theme = useTheme();

  return (
    <View style={styles.root}>
      <Icon
        style={Styles.spacey1}
        name="check-circle"
        color={theme.colors.placeholder}
        size={56}
      />
      <Text style={[Styles.spacey1, {color: theme.colors.placeholder}]}>
        无内容
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default Empty;
