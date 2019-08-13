import React from 'react';
import {View, ViewProps} from 'react-native';

export type IDividerProps = ViewProps;

const Divider: React.FunctionComponent<IDividerProps> = props => {
  return (
    <View
      style={[
        {backgroundColor: '#e6e6e6', width: '100%', height: 1},
        props.style,
      ]}
    />
  );
};

export default Divider;
