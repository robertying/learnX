import React from 'react';
import {TouchableOpacity, TouchableOpacityProps} from 'react-native';

const Button: React.FunctionComponent<TouchableOpacityProps> = (props) => {
  const {children} = props;

  return (
    <TouchableOpacity activeOpacity={0.6} {...props}>
      {children}
    </TouchableOpacity>
  );
};

export default Button;
