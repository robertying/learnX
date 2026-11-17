import type { PropsWithChildren } from 'react';
import {
  FluentProvider,
  makeStaticStyles,
  tokens,
  useFocusFinders,
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
/**
 * Keeps Tabster, Fluent's keyboard and focus manager, for as long as the app
 * runs. Fluent creates it for the controls that use it and disposes of it
 * when the last of them unmounts. A dialog's focus trap hides the rest of
 * the page from assistive technology (`aria-hidden`) and gives it back a
 * moment after closing: when that dialog was the last such control, as the
 * logout confirmation is (the login page has none), Tabster went with it
 * before giving the page back, and the page stayed hidden.
 */
const KeepTabster = () => {
  useFocusFinders();
  return null;
};

const FluentRoot = ({ children }: PropsWithChildren) => {
  const { dark } = useTheme();
  useFocusStyles();
  return (
    <FluentProvider theme={fluentTheme(dark)} style={rootStyle}>
      <KeepTabster />
      {children}
      <AlertHost />
    </FluentProvider>
  );
};

export default FluentRoot;
