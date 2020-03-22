import React from 'react';
import {Animated, StyleSheet, View, ViewProps} from 'react-native';
import Colors from '../constants/Colors';
import Placeholder, {IPlaceholderProps} from './Placeholder';

export type IPlaceholderLightProps = ViewProps & {
  loading: boolean;
  children?: React.ReactElement;
};

const styles = StyleSheet.create({
  root: {
    height: 125,
    backgroundColor: 'white',
    justifyContent: 'space-between',
  },
  flexRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lines: {
    flex: 2,
    margin: 20,
    marginTop: 26,
    justifyContent: 'center',
  },
  line: {
    backgroundColor: Colors.system('gray', 'light'),
    height: 16,
    marginBottom: 6,
    width: '100%',
    borderRadius: 5,
  },
  shortLine: {
    backgroundColor: Colors.system('gray', 'light'),
    height: 16,
    marginLeft: 20,
    width: '20%',
    borderRadius: 5,
  },
});

const PlaceholderLight: React.FunctionComponent<IPlaceholderLightProps> = (
  props,
) => {
  const renderPlaceholder: IPlaceholderProps['renderPlaceholder'] = (
    animatedStyle,
  ) => {
    return (
      <View style={[styles.root, props.style]}>
        <Animated.View
          style={[styles.shortLine, {marginTop: 15}, animatedStyle]}
        />
        <View style={styles.lines}>
          <Animated.View style={[styles.line, animatedStyle]} />
          <Animated.View style={[styles.line, animatedStyle]} />
        </View>
        <Animated.View
          style={[styles.shortLine, {marginBottom: 15}, animatedStyle]}
        />
      </View>
    );
  };

  return (
    <Placeholder loading={props.loading} renderPlaceholder={renderPlaceholder}>
      {props.children}
    </Placeholder>
  );
};

export default PlaceholderLight;
