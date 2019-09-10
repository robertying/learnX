import React, {useEffect, useState} from 'react';
import {Animated} from 'react-native';

export interface IPlaceholderProps {
  readonly loading: boolean;
  readonly renderPlaceholder: React.FunctionComponent<{
    readonly opacity: Animated.Value;
  }>;
  readonly children?: React.ReactElement;
}

const Placeholder: React.FunctionComponent<IPlaceholderProps> = props => {
  const {loading, renderPlaceholder, children} = props;

  const [opacity] = useState(new Animated.Value(1));

  useEffect(() => {
    fadeAnimation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fadeAnimation = () => {
    const newValue = 0.5;
    const oldValue = 1;
    const duration = 500;

    Animated.sequence([
      Animated.timing(opacity, {
        toValue: newValue,
        duration,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: oldValue,
        duration,
        useNativeDriver: true,
      }),
    ]).start(() => {
      fadeAnimation();
    });
  };

  return loading ? renderPlaceholder({opacity}) : children || null;
};

export default Placeholder;
