import type { PropsWithChildren } from 'react';
import {
  FluentProvider,
  makeStaticStyles,
  tokens,
} from '@fluentui/react-components';
import { useTheme } from 'theme';
import { AlertHost } from './alert';
import { fluentTheme } from './fluentTheme';

// Fills the window as React Native Web's root does, so the app's flex layout
// reaches the window's edges. A style, not a class: Fluent copies the
// provider's classes to its portals (menus, tooltips, dialogs).
const rootStyle = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  width: '100%',
} as const;

// Keyboard focus on the app's own views (cards, rows, the navigation pane) as
// Fluent draws it on its controls, not the browser's outline.
const useFocusStyles = makeStaticStyles({
  '[tabindex]:focus-visible': {
    outline: `${tokens.strokeWidthThick} solid ${tokens.colorStrokeFocus2}`,
    outlineOffset: `-${tokens.strokeWidthThick}`,
    borderRadius: tokens.borderRadiusMedium,
  },
});

/**
 * The Electron app's root: Fluent's theme for the system's light or dark
 * appearance, around the app (index.web.js), so every Fluent component, and
 * the menus and dialogs Fluent draws in portals, takes the same tokens.
 * Alerts show here too (`web/alert`).
 */
const FluentRoot = ({ children }: PropsWithChildren) => {
  const { dark } = useTheme();
  useFocusStyles();
  return (
    <FluentProvider theme={fluentTheme(dark)} style={rootStyle}>
      {children}
      <AlertHost />
    </FluentProvider>
  );
};

export default FluentRoot;
