import { bridge, type BridgeMenuItem } from 'web/bridge';

export type MenuItem = BridgeMenuItem;

/**
 * Where a menu opens for a button or row: under it, at its leading edge, as
 * Windows drops a menu from its button. `anchor` is a DOM element (a React
 * Native Web view's ref) or nothing, for the pointer.
 */
export const menuPosition = (anchor?: unknown) => {
  if (
    !anchor ||
    typeof (anchor as Element).getBoundingClientRect !== 'function'
  ) {
    return undefined;
  }
  const rect = (anchor as Element).getBoundingClientRect();
  return { x: rect.left, y: rect.bottom };
};

/**
 * Shows a native menu of `items` (electron/menus.cjs), under `anchor` or at
 * the pointer, and calls `onChoose` with the chosen item's id.
 */
export const showMenu = async (
  items: MenuItem[],
  onChoose: (id: string) => void,
  anchor?: unknown,
) => {
  const id = await bridge().menu(items, menuPosition(anchor));
  if (id !== null) {
    onChoose(id);
  }
};
