// Native menus for the page (main.ts's `menu:popup`): a card's context menu
// and the header's menus, drawn by the system as Windows draws its own.

export type MenuItem = {
  id: string;
  label?: string;
  type?: 'normal' | 'checkbox' | 'radio' | 'separator';
  checked?: boolean;
  enabled?: boolean;
  /** A count or detail after the label. */
  sublabel?: string;
};

const TYPES = new Set(['normal', 'checkbox', 'radio', 'separator']);

/**
 * The menu's template from what the page sent, keeping only the fields it
 * may set, and `onChoose` for each item's click.
 */
export const menuTemplate = (
  items: unknown,
  onChoose: (id: string) => void,
): Electron.MenuItemConstructorOptions[] =>
  (Array.isArray(items) ? items : []).flatMap(
    (item: unknown): Electron.MenuItemConstructorOptions[] => {
      if (!item || typeof item !== 'object') {
        return [];
      }
      const { id, label, type, checked, enabled, sublabel } =
        item as Partial<MenuItem>;
      if (type === 'separator') {
        return [{ type: 'separator' }];
      }
      if (typeof id !== 'string' || typeof label !== 'string') {
        return [];
      }
      return [
        {
          label: sublabel ? `${label}\t${sublabel}` : label,
          type: type && TYPES.has(type) ? type : 'normal',
          checked: !!checked,
          enabled: enabled !== false,
          click: () => onChoose(id),
        },
      ];
    },
  );

/** A point the page sent, if it is one. */
const pointOf = (position: unknown): { x: number; y: number } | undefined => {
  if (!position || typeof position !== 'object') {
    return undefined;
  }
  const { x, y } = position as { x?: unknown; y?: unknown };
  return typeof x === 'number' &&
    Number.isFinite(x) &&
    typeof y === 'number' &&
    Number.isFinite(y)
    ? { x: Math.round(x), y: Math.round(y) }
    : undefined;
};

/**
 * Shows the menu over `win`, at `position` (the page's coordinates) or the
 * pointer, and resolves with the chosen item's id, or null when it closes
 * without a choice.
 */
export const popupMenu = (
  Menu: Pick<typeof Electron.Menu, 'buildFromTemplate'>,
  win: Electron.BrowserWindow,
  items: unknown,
  position: unknown,
): Promise<string | null> =>
  new Promise(resolve => {
    let settled = false;
    const settle = (value: string | null) => {
      if (!settled) {
        settled = true;
        resolve(value);
      }
    };
    const template = menuTemplate(items, settle);
    if (!template.length) {
      settle(null);
      return;
    }
    Menu.buildFromTemplate(template).popup({
      window: win,
      ...pointOf(position),
      // The menu closes before an item's click runs on some systems.
      callback: () => setTimeout(() => settle(null), 100),
    });
  });
