import { View } from 'react-native';
import { Image } from 'web/packages/swiftUI';
import type { ToastBackgroundProps, ToastSymbolProps } from './index';

export type { ToastBackgroundProps, ToastSymbolProps } from './index';

// The Electron app has no UIKit: the toast's parts are drawn here.

/** The toast's backdrop in the Electron app: a dark rounded panel. */
export const ToastBackground = ({
  cornerRadius,
  visible,
  style,
  ...props
}: ToastBackgroundProps) => (
  <View
    {...props}
    style={[
      style,
      {
        borderRadius: cornerRadius,
        backgroundColor: 'rgba(36, 36, 36, 0.92)',
        opacity: visible ? 1 : 0,
        transitionProperty: 'opacity',
        transitionDuration: '200ms',
      } as object,
    ]}
  />
);

/** The toast's symbol, as the Material Symbol the app maps it to. */
export const ToastSymbol = ({ name, size, color, style }: ToastSymbolProps) => (
  <View style={style}>
    <Image systemName={name} size={size} color={color} />
  </View>
);
