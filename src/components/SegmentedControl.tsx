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

const SegmentedControl: React.FunctionComponent<ISegmentedControlProps> = props => {
  const {style, ...restProps} = props;

  return Platform.OS === 'ios' ? (
    <SegmentedControlIOS
      style={StyleSheet.compose(
        {margin: 20, marginTop: 10, marginBottom: 10},
        style,
      )}
      {...restProps}
    />
  ) : (
    <View
      style={StyleSheet.compose(
        {
          flex: 1,
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-evenly',
          alignItems: 'center',
          padding: 10,
        },
        style,
      )}>
      {props.values &&
        props.values.map((value, index) => (
          <Chip
            selected={index === props.selectedIndex}
            onPress={
              props.onValueChange
                ? () => props.onValueChange!(value)
                : undefined
            }>
            {value}
          </Chip>
        ))}
    </View>
  );
};

export default SegmentedControl;
