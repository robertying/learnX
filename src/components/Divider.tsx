import React from 'react';
import {View, ViewProps} from 'react-native';
import {useDarkMode} from 'react-native-dark-mode';

export type IDividerProps = ViewProps;

const Divider: React.FunctionComponent<IDividerProps> = props => {
  const isDarkMode = useDarkMode();

  return (
    <View
      style={[
        {
          backgroundColor: isDarkMode ? 'rgb(44,44,46)' : '#e6e6e6',
          width: '100%',
          height: 1,
        },
        props.style,
      ]}
    />
  );
};

export default Divider;
