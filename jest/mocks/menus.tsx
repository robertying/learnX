import { ReactNode } from 'react';

// The native menu module isn't in Jest (and `expo` is ESM). Without it, cards
// render their content without a context menu, and menu commands never fire.
export const Menus = null;
export const ContextMenuView = ({ children }: { children: ReactNode }) =>
  children;
