import React from 'react';
import {TouchableOpacity, TouchableOpacityProps} from 'react-native';
import Colors from '../constants/Colors';

const Button: React.FunctionComponent<TouchableOpacityProps> = props => {
  const {children} = props;

  return (
    <TouchableOpacity activeOpacity={Colors.activeOpacity} {...props}>
      {children}
    </TouchableOpacity>
  );
};

export default Button;
