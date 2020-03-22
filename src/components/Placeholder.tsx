import React, {useEffect, useState, useCallback} from 'react';
import {Animated} from 'react-native';

export interface IPlaceholderProps {
  loading: boolean;
  renderPlaceholder: React.FunctionComponent<{
    opacity: Animated.Value;
  }>;
  children?: React.ReactElement;
}

const Placeholder: React.FunctionComponent<IPlaceholderProps> = (props) => {
  const {loading, renderPlaceholder, children} = props;

  const [opacity] = useState(new Animated.Value(1));

  const fadeAnimation = useCallback(() => {
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
  }, [opacity]);

  useEffect(() => {
    fadeAnimation();
  }, [fadeAnimation]);

  return loading ? renderPlaceholder({opacity}) : children || null;
};

export default Placeholder;
