import useAppCommand from 'hooks/useAppCommand';

/**
 * Next Item and Previous Item (⌥⌘↓ and ⌥⌘↑) from the menu bar on iPad and
 * Mac: `open` gets the index of the item after or before the one open beside
 * the list (`openedIndex`), or of the first or last when none of them is. At
 * either end nothing happens. Only while `enabled`: the list on screen, beside
 * a detail pane.
 */
const useItemStepping = (
  count: number,
  openedIndex: number,
  open: (index: number) => void,
  enabled: boolean,
) => {
  const step = (offset: 1 | -1) => {
    const index =
      openedIndex === -1
        ? offset === 1
          ? 0
          : count - 1
        : openedIndex + offset;
    if (index >= 0 && index < count) {
      open(index);
    }
  };
  useAppCommand('nextItem', () => step(1), enabled);
  useAppCommand('previousItem', () => step(-1), enabled);
};

export default useItemStepping;
