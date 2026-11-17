import type { CardMenuProps } from './CardMenu.shared';

export type { CardMenuProps } from './CardMenu.shared';

/**
 * A card's actions are a native context menu in the Electron app (right-click
 * or the menu key, `modules/menus`' `ContextMenuView`), so there's no menu
 * to draw here, as on iOS.
 */
const CardMenu: React.FC<CardMenuProps> = () => null;

export default CardMenu;
