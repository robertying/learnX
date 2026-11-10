import { ReactNode } from 'react';

// The native menu module isn't in Jest (and `expo` is ESM). Without it, cards
// render their content without a context menu, and menu commands never fire.
export const Menus = null;
// A jest.fn, so tests can read the menu's actions and choose one.
export const ContextMenuView = jest.fn(
  ({ children }: { children: ReactNode }) => children,
);
