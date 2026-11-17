// Native menus for the page (main.cjs's `menu:popup`): a card's context menu
// and the header's menus, drawn by the system as Windows draws its own.

/**
 * @typedef {object} MenuItem
 * @property {string} id
 * @property {string} [label]
 * @property {'normal' | 'checkbox' | 'radio' | 'separator'} [type]
 * @property {boolean} [checked]
 * @property {boolean} [enabled]
 * @property {string} [sublabel] A count or detail after the label.
 */

const TYPES = new Set(['normal', 'checkbox', 'radio', 'separator']);

/**
 * The menu's template from what the page sent, keeping only the fields it
 * may set, and `onChoose` for each item's click.
 * @param {unknown} items
 * @param {(id: string) => void} onChoose
 * @returns {Electron.MenuItemConstructorOptions[]}
 */
const menuTemplate = (items, onChoose) =>
  (Array.isArray(items) ? items : []).flatMap(
    /** @returns {Electron.MenuItemConstructorOptions[]} */
    item => {
      if (!item || typeof item !== 'object') {
        return [];
      }
      const { id, label, type, checked, enabled, sublabel } =
        /** @type {Partial<MenuItem>} */ (item);
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

/**
 * Shows the menu over `win`, at `position` (the page's coordinates) or the
 * pointer, and resolves with the chosen item's id, or null when it closes
 * without a choice.
 * @param {typeof Electron.Menu} Menu
 * @param {Electron.BrowserWindow} win
 * @param {unknown} items
 * @param {unknown} position
 * @returns {Promise<string | null>}
 */
const popupMenu = (Menu, win, items, position) =>
  new Promise(resolve => {
    let settled = false;
    const settle = (/** @type {string | null} */ value) => {
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
    const at =
      position &&
      typeof position === 'object' &&
      Number.isFinite(/** @type {{x: unknown}} */ (position).x) &&
      Number.isFinite(/** @type {{y: unknown}} */ (position).y)
        ? {
            x: Math.round(/** @type {{x: number}} */ (position).x),
            y: Math.round(/** @type {{y: number}} */ (position).y),
          }
        : {};
    Menu.buildFromTemplate(template).popup({
      window: win,
      ...at,
      // The menu closes before an item's click runs on some systems.
      callback: () => setTimeout(() => settle(null), 100),
    });
  });

module.exports = { menuTemplate, popupMenu };
