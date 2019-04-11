import React, { useState } from "react";
import {
  Animated,
  NativeSyntheticEvent,
  TextInput,
  TextInputFocusEventData,
  TextInputProps,
  View,
  ViewProps
} from "react-native";
import { iOSUIKit } from "react-native-typography";

export type ITextFieldProps = TextInputProps & {
  readonly innerRef?: React.Ref<any>;
  readonly containerStyle?: ViewProps["style"];
  readonly icon?: React.ReactNode;
  readonly tintColor: string;
};

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
      duration: 200
    }).start();

    if (props.onFocus) {
      props.onFocus(e);
    }
  };

  const onBlur = (e: NativeSyntheticEvent<TextInputFocusEventData>) => {
    Animated.timing(opacity, {
      toValue: 0.01,
      duration: 200
    }).start();

    if (props.onBlur) {
      props.onBlur(e);
    }
  };

  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          width: "60%",
          backgroundColor: "transparent"
        },
        containerStyle
      ]}
    >
      {icon}
      <AnimatedTextInput
        style={[
          {
            flex: 1,
            padding: 5,
            marginLeft: 5,
            borderBottomWidth: 1,
            borderBottomColor: opacity.interpolate({
              inputRange: [0.01, 1],
              outputRange: ["transparent", tintColor]
            }),
            color: tintColor,
            fontSize: iOSUIKit.bodyObject.fontSize
          },
          style
        ]}
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

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

export default React.forwardRef(
  (props: ITextFieldProps, ref: React.Ref<any>) => (
    <TextField innerRef={ref} {...props} />
  )
);
