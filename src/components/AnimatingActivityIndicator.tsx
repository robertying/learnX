import React from 'react';
import {ActivityIndicator} from 'react-native';

const AnimatingActivityIndicator: React.FC = () => (
  <ActivityIndicator
    style={{
      flex: 1,
      position: 'absolute',
      top: 35,
      right: 60,
    }}
    color="gray"
    animating={true}
  />
);

export default AnimatingActivityIndicator;
