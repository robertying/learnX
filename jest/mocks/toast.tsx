import { useEffect, useEffectEvent } from 'react';
import { View, type ViewProps } from 'react-native';

// How long the HUD takes to animate away, as the native view does.
export const hideDuration = 200;

// The toast's UIKit views: plain views. The HUD reports it has gone a moment
// after it is hidden. They are findable as `toast-hud` and `icon-<name>`.
export const ToastHUD = ({
  visible,
  onHidden,
  ...props
}: ViewProps & { visible: boolean; onHidden: () => void }) => {
  const hidden = useEffectEvent(onHidden);
  useEffect(() => {
    if (visible) {
      return;
    }
    const timer = setTimeout(hidden, hideDuration);
    return () => clearTimeout(timer);
  }, [visible]);
  return <View testID="toast-hud" {...props} />;
};

export const ToastSymbol = ({ name }: { name: string }) => (
  <View testID={`icon-${name}`} />
);
