import { useEffect, useRef, type ComponentRef } from 'react';
import type { View } from 'react-native';
import { isElectron } from 'helpers/platform';

/**
 * A ref for a view that is out of sight (a hidden pane, a tab's page that
 * isn't selected) and sets its `inert` while it is: React Native Web hides
 * such a view from neither the keyboard nor a screen reader, so Tab would go
 * through its buttons unseen, scrolling them into view. `inert` takes it out
 * of both, as the native views are (Electron app).
 */
const useInert = (inert: boolean) => {
  const view = useRef<ComponentRef<typeof View>>(null);
  useEffect(() => {
    if (isElectron() && view.current) {
      (view.current as unknown as HTMLElement).inert = inert;
    }
  }, [inert]);
  return view;
};

export default useInert;
