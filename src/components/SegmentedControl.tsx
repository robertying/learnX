import React from 'react';
import {StyleSheet} from 'react-native';
import SegmentedControl, {
  SegmentedControlProps,
} from '@react-native-community/segmented-control';

export type ISegmentedControlProps = SegmentedControlProps;

const styles = StyleSheet.create({
  seg: {
    margin: 20,
    marginTop: 10,
    marginBottom: 10,
  },
  root: {
    flex: 1,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    padding: 10,
  },
});

const MySegmentedControl: React.FunctionComponent<ISegmentedControlProps> = (
  props,
) => {
  const {style, ...restProps} = props;

  return <SegmentedControl style={[styles.seg, style]} {...restProps} />;
};

export default MySegmentedControl;
