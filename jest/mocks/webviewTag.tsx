import { useImperativeHandle, type Ref } from 'react';
import { View } from 'react-native';

/**
 * A stand-in for Electron's `<webview>` element (src/web/packages/
 * webviewTag.tsx): an event target with the element's methods, attached once
 * a test calls `attach`.
 */
export class MockWebview extends EventTarget {
  id: number | null = null;
  url = 'about:blank';
  loads: [string, unknown][] = [];
  getWebContentsId = () => {
    if (this.id === null) {
      throw new Error('not attached');
    }
    return this.id;
  };
  loadURL = jest.fn(async (url: string, options?: unknown) => {
    this.loads.push([url, options]);
  });
  getURL = () => this.url;
  getTitle = () => 'Title';
  isLoading = () => false;
  canGoBack = () => true;
  canGoForward = () => false;
  goBack = jest.fn();
  goForward = jest.fn();
  reload = jest.fn();
  stop = jest.fn();
  executeJavaScript = jest.fn(async () => undefined);
  focus = jest.fn();

  attach(id: number) {
    this.id = id;
    this.dispatchEvent(new Event('dom-ready'));
  }

  emit(type: string, fields: object = {}) {
    this.dispatchEvent(Object.assign(new Event(type), fields));
  }
}

/** The elements rendered, newest last; tests empty it. */
export const mockViews: MockWebview[] = [];

/** A view with the element's attributes, its style as `tagStyle`. */
const WebviewTag: React.FC<{ ref: Ref<unknown>; style: unknown }> = ({
  ref,
  style,
  ...props
}) => {
  useImperativeHandle(ref, () => {
    const view = new MockWebview();
    mockViews.push(view);
    return view;
  }, []);
  // Attributes and style as props a test reads.
  return (
    <View testID="webview" {...({ ...props, tagStyle: style } as object)} />
  );
};

export default WebviewTag;
