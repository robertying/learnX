import {
  createContext,
  useContext,
  useState,
  type PropsWithChildren,
} from 'react';
import { StyleSheet, View } from 'react-native';

const SlotContext = createContext<Element | null>(null);

/**
 * The Electron app's window: the navigation pane at its leading edge, then
 * the split view of list and detail. The tab navigator, which is inside the
 * split's list pane, draws its pane into the slot (a portal), so the pane
 * spans the window's height beside both columns, and sheets presented over
 * the list (Search) leave it in place.
 */
const WindowFrame = ({ children }: PropsWithChildren) => {
  const [slot, setSlot] = useState<Element | null>(null);
  return (
    <SlotContext value={slot}>
      <View style={styles.window}>
        <View
          ref={view => setSlot(view as unknown as Element | null)}
          style={styles.slot}
        />
        <View style={styles.content}>{children}</View>
      </View>
    </SlotContext>
  );
};

/** The DOM element the navigation pane is drawn into, once it's there. */
export const useNavigationPaneSlot = () => useContext(SlotContext);

const styles = StyleSheet.create({
  window: {
    flex: 1,
    flexDirection: 'row',
  },
  slot: {
    flexDirection: 'row',
  },
  content: {
    flex: 1,
  },
});

export default WindowFrame;
