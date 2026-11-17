import { type ComponentRef, useEffect, useRef, useState } from 'react';
import { View, type ViewProps } from 'react-native';
import useAndroidKeyboard from 'hooks/useAndroidKeyboard';

/**
 * A view that ends above the Android keyboard: its bottom is padded by as
 * much of it as the keyboard covers. Measured on the screen, so whatever is
 * under the view (the navigation bar, which hides while the keyboard is up,
 * the gesture bar) counts as it should. Compose's `imePadding` would pad by
 * the keyboard's whole height from the bottom of the screen, leaving a gap
 * above the keyboard as tall as what lies under the view. A plain view on iOS
 * and Mac, where forms keep clear of the keyboard themselves.
 */
const KeyboardInsetView: React.FC<ViewProps> = ({ style, ...props }) => {
  const ref = useRef<ComponentRef<typeof View>>(null);
  const [overlap, setOverlap] = useState(0);
  // The view's bottom moves once the navigation bar hides for the keyboard,
  // so it's measured again after that.
  const remeasure = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(remeasure.current), []);

  useAndroidKeyboard({
    onShow: keyboardTop => {
      const measure = () =>
        ref.current?.measureInWindow((_x, y, _width, height) => {
          // The padding is inside the view, so its frame stays put.
          setOverlap(Math.max(0, y + height - keyboardTop));
        });
      measure();
      clearTimeout(remeasure.current);
      remeasure.current = setTimeout(measure, 300);
    },
    onHide: () => {
      clearTimeout(remeasure.current);
      setOverlap(0);
    },
  });

  return (
    <View
      ref={ref}
      collapsable={false}
      style={[style, { paddingBottom: overlap }]}
      {...props}
    />
  );
};

export default KeyboardInsetView;
