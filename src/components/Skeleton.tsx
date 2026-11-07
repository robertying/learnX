import { useEffect, useState } from 'react';
import { StyleSheet, View, Animated } from 'react-native';
import { useTheme } from 'theme';

const Skeleton: React.FC<React.PropsWithChildren<unknown>> = () => {
  const theme = useTheme();

  const [opacity] = useState(() => new Animated.Value(1));

  useEffect(() => {
    const duration = 500;
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.5,
          duration,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.surface }]}>
      <Animated.View style={[styles.line1, { opacity }]} />
      <Animated.View style={[styles.line2, { opacity }]} />
      <Animated.View style={[styles.line3, { opacity }]} />
      <Animated.View style={[styles.line4, { opacity }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    zIndex: 0,
  },
  line1: {
    backgroundColor: 'lightgrey',
    height: 16,
    width: '30%',
    borderRadius: 4,
    marginVertical: 8,
  },
  line2: {
    backgroundColor: 'lightgrey',
    height: 16,
    width: '100%',
    borderRadius: 4,
    marginVertical: 8,
  },
  line3: {
    backgroundColor: 'lightgrey',
    height: 16,
    width: '80%',
    borderRadius: 4,
    marginVertical: 8,
  },
  line4: {
    backgroundColor: 'lightgrey',
    height: 16,
    width: '20%',
    borderRadius: 4,
    marginVertical: 8,
  },
});

export default Skeleton;
