import React, {useState} from 'react';
import {
  Animated,
  NativeSyntheticEvent,
  TextInput,
  TextInputFocusEventData,
  TextInputProps,
  View,
  ViewProps,
  StyleSheet,
} from 'react-native';
import {iOSUIKit} from 'react-native-typography';

export type ITextFieldProps = TextInputProps & {
  innerRef?: React.Ref<any>;
  containerStyle?: ViewProps['style'];
  icon?: React.ReactNode;
  tintColor: string;
};

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '60%',
    backgroundColor: 'transparent',
  },
  textInput: {
    flex: 1,
    padding: 5,
    marginLeft: 5,
    borderBottomWidth: 1,
    fontSize: iOSUIKit.bodyObject.fontSize,
  },
});

const TextField: React.FunctionComponent<ITextFieldProps> = props => {
  const {
    containerStyle,
    style,
    icon,
    tintColor,
    innerRef,
    ...restProps
  } = props;

  const [opacity] = useState(new Animated.Value(0.01));

  const onFocus = (e: NativeSyntheticEvent<TextInputFocusEventData>) => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start();

    if (props.onFocus) {
      props.onFocus(e);
    }
  };

  const onBlur = (e: NativeSyntheticEvent<TextInputFocusEventData>) => {
    Animated.timing(opacity, {
      toValue: 0.01,
      duration: 200,
      useNativeDriver: false,
    }).start();

    if (props.onBlur) {
      props.onBlur(e);
    }
  };

  return (
    <View style={[styles.root, containerStyle]}>
      {icon}
      <AnimatedTextInput
        style={
          [
            styles.textInput,
            {
              borderBottomColor: opacity.interpolate({
                inputRange: [0.01, 1],
                outputRange: ['transparent', tintColor],
              }),
              color: tintColor,
            },
            style,
          ] as any
        }
        selectionColor={tintColor}
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
        placeholderTextColor={tintColor}
        onFocus={onFocus}
        onBlur={onBlur}
        ref={innerRef}
        {...restProps}
      />
    </View>
  );
};

const AnimatedTextInput = (Animated.createAnimatedComponent(
  TextInput,
) as unknown) as typeof TextInput;

export default React.forwardRef(
  (props: ITextFieldProps, ref: React.Ref<any>) => (
    <TextField innerRef={ref} {...props} />
  ),
);
