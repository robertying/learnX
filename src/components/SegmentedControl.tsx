import React from 'react';
import {
  View,
  SegmentedControlIOSProps,
  Platform,
  SegmentedControlIOS,
  StyleSheet,
} from 'react-native';
import {Chip} from 'react-native-paper';

export type ISegmentedControlProps = SegmentedControlIOSProps;

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

const SegmentedControl: React.FunctionComponent<ISegmentedControlProps> = (
  props,
) => {
  const {style, ...restProps} = props;

  return Platform.OS === 'ios' ? (
    <SegmentedControlIOS style={[styles.seg, style]} {...restProps} />
  ) : (
    <View style={[styles.root, style]}>
      {props.values?.map((value, index) => (
        <Chip
          key={value}
          selected={index === props.selectedIndex}
          onPress={() => props.onValueChange?.(value)}>
          {value}
        </Chip>
      ))}
    </View>
  );
};

export default SegmentedControl;
