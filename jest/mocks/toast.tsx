import { View } from 'react-native';

// The toast's UIKit views: plain views, the symbol findable as `icon-<name>`.
export const ToastBackground = View;
export const ToastSymbol = ({ name }: { name: string }) => (
  <View testID={`icon-${name}`} />
);
