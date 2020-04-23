import React from 'react';
import {View, ViewProps, StyleSheet} from 'react-native';
import {useColorScheme} from 'react-native-appearance';

export type IDividerProps = ViewProps;

const Divider: React.FC<IDividerProps> = (props) => {
  const colorScheme = useColorScheme();

  return (
    <View
      style={StyleSheet.compose(
        {
          backgroundColor: colorScheme === 'dark' ? 'rgb(44,44,46)' : '#e6e6e6',
          width: '100%',
          height: 1,
        },
        props.style,
      )}
    />
  );
};

export default Divider;
