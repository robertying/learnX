import React from 'react';
import {Animated, StyleSheet, View, ViewProps} from 'react-native';
import Colors from '../constants/Colors';
import Placeholder, {IPlaceholderProps} from './Placeholder';

export type INoticePlaceholderProps = ViewProps & {
  readonly loading: boolean;
  readonly children?: React.ReactElement;
};

const NoticePlaceholder: React.FunctionComponent<
  INoticePlaceholderProps
> = props => {
  const renderPlaceholder: IPlaceholderProps['renderPlaceholder'] = animatedStyle => {
    return (
      <View
        style={[
          {
            height: 125,
            backgroundColor: 'black',
            justifyContent: 'space-between',
          },
          props.style,
        ]}>
        <Animated.View
          style={[styles.shortLine, {marginTop: 15}, animatedStyle]}
        />
        <View
          style={{
            flex: 2,
            margin: 20,
            marginTop: 26,
            justifyContent: 'center',
          }}>
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

export default NoticePlaceholder;

const styles = StyleSheet.create({
  flexRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  line: {
    backgroundColor: Colors.grayDark,
    height: 16,
    marginBottom: 6,
    width: '100%',
    borderRadius: 5,
  },
  shortLine: {
    backgroundColor: Colors.grayDark,
    height: 16,
    marginLeft: 20,
    width: '20%',
    borderRadius: 5,
  },
});
