import type { PropsWithChildren } from 'react';

/**
 * The window around the main UI. On iOS and Android it adds nothing; the
 * Electron app's (`WindowFrame.web.tsx`) holds the navigation pane at the
 * window's leading edge, beside the split view.
 */
const WindowFrame = ({ children }: PropsWithChildren) => children;

/** Where the navigation pane goes: nowhere outside the Electron app. */
export const useNavigationPaneSlot = (): Element | null => null;

export default WindowFrame;
