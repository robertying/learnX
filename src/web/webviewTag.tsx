import { createElement, type CSSProperties, type Ref } from 'react';

/**
 * Electron's `<webview>` element, which only exists in the Electron app's
 * window (`webviewTag` in electron/main.ts). Its own module, so tests can
 * stand in for the element.
 */
const WebviewTag: React.FC<{
  ref: Ref<unknown>;
  src: string;
  partition: string;
  webpreferences?: string;
  style: CSSProperties;
}> = props => createElement('webview', props);

export default WebviewTag;
