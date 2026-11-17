import {
  useEffect,
  useEffectEvent,
  useImperativeHandle,
  useRef,
  useState,
  type Ref,
} from 'react';
import { StyleSheet, View } from 'react-native';
import type { WebViewProps } from 'react-native-webview';
import type {
  WebViewNavigation,
  WebViewSource,
  WebViewSourceHtml,
  WebViewSourceUri,
} from 'react-native-webview/lib/WebViewTypes';
import { bridge, type WebviewLoadRequest } from 'web/bridge';
import WebviewTag from 'web/webviewTag';
import FilePreview from 'web/FilePreview';
import webviewPartition from 'constants/webviewPartition.json';

/**
 * Stands in for react-native-webview in the Electron app: an Electron
 * `<webview>` on the window's session, so pages share the cookies the app's
 * requests use. The main process hardens it as it attaches (sandbox, context
 * isolation, learnX's own preload; electron/webviews.cjs), asks this
 * component about every top-level load (`onShouldStartLoadWithRequest`,
 * `originWhitelist`) and keeps it on Tsinghua's sites, courseX and learnX's
 * GitHub pages. The page posts messages with
 * `window.ReactNativeWebView.postMessage`, and the injected scripts run as on
 * the phone. A downloaded file (a `file:` URI, File detail's preview) shows
 * in `FilePreview` instead, outside any web view.
 */

/** The subset of Electron's `<webview>` element the stand-in calls. */
export interface WebviewElement extends EventTarget {
  getWebContentsId: () => number;
  loadURL: (
    url: string,
    options?: { baseURLForDataURL?: string; extraHeaders?: string },
  ) => Promise<void>;
  getURL: () => string;
  getTitle: () => string;
  isLoading: () => boolean;
  canGoBack: () => boolean;
  canGoForward: () => boolean;
  goBack: () => void;
  goForward: () => void;
  reload: () => void;
  stop: () => void;
  executeJavaScript: (code: string) => Promise<unknown>;
  focus: () => void;
}

/** What a ref to the web view offers, as react-native-webview's does. */
export interface WebViewHandle {
  goBack: () => void;
  goForward: () => void;
  reload: () => void;
  stopLoading: () => void;
  injectJavaScript: (script: string) => void;
  requestFocus: () => void;
}

/** React Native's default: web pages, blank pages and data. */
const DEFAULT_ORIGIN_WHITELIST = [
  'http://',
  'https://',
  'about:blank',
  'data:',
];

/** The session the main process lets web views use (webviews.cjs). */
const PARTITION = webviewPartition.partition;

/** The `<webview>` events the stand-in turns into React Native's. */
export const WEBVIEW_EVENTS = [
  'did-start-loading',
  'did-finish-load',
  'did-stop-loading',
  'did-navigate',
  'did-navigate-in-page',
  'did-fail-load',
  'ipc-message',
] as const;

/** Whether the web view has attached: its methods throw until then. */
const attached = (view: WebviewElement | null): view is WebviewElement => {
  try {
    view?.getWebContentsId();
    return !!view;
  } catch {
    return false;
  }
};

/** What the web view shows now, for an event's `nativeEvent`. */
export const navigationStateOf = (
  view: WebviewElement | null,
): WebViewNavigation => {
  const shown = attached(view) ? view : null;
  return {
    url: shown?.getURL() ?? '',
    title: shown?.getTitle() ?? '',
    loading: shown?.isLoading() ?? false,
    canGoBack: shown?.canGoBack() ?? false,
    canGoForward: shown?.canGoForward() ?? false,
    lockIdentifier: 0,
    navigationType: 'other',
    mainDocumentURL: shown?.getURL() ?? '',
  };
};

/**
 * Whether `url` matches `originWhitelist`, React Native's way: each entry is
 * a pattern for the start of the URL, with `*` for anything.
 */
export const matchesOriginWhitelist = (url: string, whitelist: string[]) =>
  whitelist.some(pattern =>
    new RegExp(
      `^${pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}`,
    ).test(url),
  );

/**
 * Headers for a URI source as Electron's `extraHeaders`. `Cookie` is left
 * out: the web view already sends the session's own.
 */
export const extraHeadersOf = (headers: Record<string, string> = {}) =>
  Object.entries(headers)
    .filter(([name]) => name.toLowerCase() !== 'cookie')
    .map(([name, value]) => `${name}: ${value}\n`)
    .join('');

/**
 * The longest data URL an HTML source loads as. Chromium refuses URLs over
 * 2 MB; longer HTML (a notice with a pasted picture, or a long Chinese one
 * with math, since every character is encoded) loads through the main
 * process instead.
 */
export const MAX_DATA_URL_LENGTH = 1_500_000;

/**
 * Loads a source: HTML as a data URL at its base URL (or, too long for one,
 * served at the base URL by the main process, electron/webviews.cjs), or an
 * http(s) URI. Anything else stays blank (files show in `FilePreview`).
 * A load the app's rules refuse rejects (ERR_ABORTED), which the page's own
 * events report.
 */
export const loadSource = (view: WebviewElement, source?: WebViewSource) => {
  const { html, baseUrl } = (source ?? {}) as Partial<WebViewSourceHtml>;
  const { uri, headers } = (source ?? {}) as Partial<WebViewSourceUri>;
  if (html !== undefined) {
    const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
    const asDataUrl = () =>
      view
        .loadURL(dataUrl, { baseURLForDataURL: baseUrl || 'about:blank' })
        .catch(() => {});
    if (
      dataUrl.length > MAX_DATA_URL_LENGTH &&
      baseUrl &&
      /^https?:/i.test(baseUrl)
    ) {
      void bridge()
        .webviews.loadHtml(view.getWebContentsId(), html, baseUrl)
        .catch(() => false)
        .then(loaded => {
          if (!loaded) {
            void asDataUrl();
          }
        });
    } else {
      void asDataUrl();
    }
  } else if (uri && /^https?:/i.test(uri)) {
    const extraHeaders = extraHeadersOf(
      headers as Record<string, string> | undefined,
    );
    view
      .loadURL(uri, extraHeaders ? { extraHeaders } : undefined)
      .catch(() => {});
  }
};

type EventProps = Pick<
  WebViewProps,
  | 'onMessage'
  | 'onLoadStart'
  | 'onLoad'
  | 'onLoadEnd'
  | 'onLoadProgress'
  | 'onError'
  | 'onNavigationStateChange'
>;

/**
 * Calls the React Native callback for a `<webview>` event, with what the web
 * view shows as its `nativeEvent`. The blank page it starts on is no page of
 * the app's, so its loads go unreported.
 */
export const handleWebviewEvent = (
  event: Event,
  view: WebviewElement | null,
  props: EventProps,
) => {
  const nativeEvent = navigationStateOf(view);
  if (
    (!nativeEvent.url || nativeEvent.url === 'about:blank') &&
    event.type !== 'ipc-message'
  ) {
    return;
  }
  const synthetic = { nativeEvent } as never;
  const progress = (value: number) =>
    ({ nativeEvent: { ...nativeEvent, progress: value } }) as never;
  switch (event.type) {
    case 'did-start-loading':
      props.onLoadStart?.(synthetic);
      props.onLoadProgress?.(progress(0.1));
      break;
    case 'did-finish-load':
      props.onLoad?.(synthetic);
      break;
    case 'did-stop-loading':
      props.onLoadProgress?.(progress(1));
      props.onLoadEnd?.(synthetic);
      props.onNavigationStateChange?.(nativeEvent);
      break;
    case 'did-navigate':
    case 'did-navigate-in-page':
      props.onNavigationStateChange?.(nativeEvent);
      break;
    case 'did-fail-load': {
      const { errorCode, errorDescription, validatedURL, isMainFrame } =
        event as Event & {
          errorCode: number;
          errorDescription: string;
          validatedURL: string;
          isMainFrame: boolean;
        };
      // -3 is a load cancelled, by the app's own rules among others.
      if (isMainFrame && errorCode !== -3) {
        props.onError?.({
          nativeEvent: {
            ...nativeEvent,
            url: validatedURL,
            code: errorCode,
            description: errorDescription,
            domain: 'Electron',
          },
        } as never);
      }
      break;
    }
    case 'ipc-message': {
      const { channel, args } = event as Event & {
        channel: string;
        args: unknown[];
      };
      if (channel === 'message') {
        props.onMessage?.({
          nativeEvent: { ...nativeEvent, data: String(args[0]) },
        } as never);
      }
      break;
    }
  }
};

/** Each mounted web view's answer to its loads, by its web contents. */
const loadHandlers = new Map<
  number,
  (request: WebviewLoadRequest) => boolean
>();
let answering = false;

/**
 * Answers the main process's questions about loads, from the web view they
 * are for. A web view nobody shows any more gets nothing loaded.
 */
const answerLoads = () => {
  if (answering) {
    return;
  }
  answering = true;
  bridge().webviews.onAsk(request => {
    const handler = loadHandlers.get(request.guestId);
    let allow = false;
    try {
      allow = handler ? handler(request) : false;
    } catch (error) {
      console.warn(`Deciding on a load failed: ${String(error)}`);
    }
    bridge().webviews.answer(request.requestId, allow);
  });
};

/**
 * Sets a `<webview>` up once it has attached on its blank page: its scripts
 * go to the main process, its loads are decided by `shouldStart`, and its
 * events go to `handleEvent`. `onReady` gets its web contents' id, to load
 * the source. Returns the clean-up.
 */
export const connectWebview = (
  view: WebviewElement,
  {
    shouldStart,
    handleEvent,
    scripts,
    onReady,
  }: {
    shouldStart: (request: WebviewLoadRequest) => boolean;
    handleEvent: (event: Event) => void;
    scripts: () => { before?: string; after?: string };
    onReady: (guestId: number) => void;
  },
) => {
  let guestId: number | null = null;
  let connected = true;
  const attach = () => {
    if (guestId !== null || !attached(view)) {
      return;
    }
    const id = view.getWebContentsId();
    guestId = id;
    answerLoads();
    loadHandlers.set(id, shouldStart);
    void bridge()
      .webviews.configure(id, scripts())
      .then(configured => {
        if (configured && connected) {
          onReady(id);
        }
      });
  };
  view.addEventListener('dom-ready', attach);
  for (const name of WEBVIEW_EVENTS) {
    view.addEventListener(name, handleEvent);
  }
  attach();
  return () => {
    connected = false;
    view.removeEventListener('dom-ready', attach);
    for (const name of WEBVIEW_EVENTS) {
      view.removeEventListener(name, handleEvent);
    }
    if (guestId !== null) {
      loadHandlers.delete(guestId);
    }
  };
};

type Props = WebViewProps & { ref?: Ref<WebViewHandle> };

const WebView: React.FC<Props> = props => {
  const uri = (props.source as WebViewSourceUri | undefined)?.uri;
  return uri?.startsWith('file:') ? (
    <FilePreview uri={uri} style={props.style} />
  ) : (
    <WebPage {...props} />
  );
};

const WebPage: React.FC<Props> = ({
  ref,
  source,
  style,
  originWhitelist = DEFAULT_ORIGIN_WHITELIST,
  javaScriptEnabled = true,
  injectedJavaScript,
  injectedJavaScriptBeforeContentLoaded,
  onShouldStartLoadWithRequest,
  ...eventProps
}) => {
  const element = useRef<WebviewElement | null>(null);
  /**
   * The web view's web contents, once it is attached and set up: a new
   * object each time, even for the same web contents, since a load under
   * way when its effects re-ran (a screen restored) may have been refused
   * meanwhile, and the source loads again.
   */
  const [guest, setGuest] = useState<{ id: number } | null>(null);

  useImperativeHandle(ref, () => ({
    goBack: () => element.current?.goBack(),
    goForward: () => element.current?.goForward(),
    reload: () => element.current?.reload(),
    stopLoading: () => element.current?.stop(),
    injectJavaScript: script => {
      void element.current?.executeJavaScript(script).catch(() => {});
    },
    requestFocus: () => element.current?.focus(),
  }));

  const shouldStart = useEffectEvent(
    (request: WebviewLoadRequest) =>
      matchesOriginWhitelist(request.url, originWhitelist) &&
      (onShouldStartLoadWithRequest?.({
        ...navigationStateOf(element.current),
        url: request.url,
        isTopFrame: request.isTopFrame,
        mainDocumentURL: request.url,
        hasTargetFrame: false,
      } as Parameters<
        NonNullable<WebViewProps['onShouldStartLoadWithRequest']>
      >[0]) ??
        true),
  );
  const handleEvent = useEffectEvent((event: Event) =>
    handleWebviewEvent(event, element.current, eventProps),
  );
  const scripts = useEffectEvent(() => ({
    before: injectedJavaScriptBeforeContentLoaded,
    after: injectedJavaScript,
  }));

  useEffect(() => {
    const view = element.current;
    return view
      ? connectWebview(view, {
          shouldStart,
          handleEvent,
          scripts,
          onReady: id => setGuest({ id }),
        })
      : undefined;
  }, []);

  // Later script changes apply from the next load on, as on the phone.
  useEffect(() => {
    if (guest) {
      void bridge().webviews.configure(guest.id, {
        before: injectedJavaScriptBeforeContentLoaded,
        after: injectedJavaScript,
      });
    }
  }, [guest, injectedJavaScriptBeforeContentLoaded, injectedJavaScript]);

  const html = (source as WebViewSourceHtml | undefined)?.html;
  const baseUrl = (source as WebViewSourceHtml | undefined)?.baseUrl;
  const uri = (source as WebViewSourceUri | undefined)?.uri;
  const headers = JSON.stringify(
    (source as WebViewSourceUri | undefined)?.headers ?? {},
  );
  useEffect(() => {
    if (guest && element.current) {
      loadSource(element.current, {
        html,
        baseUrl,
        uri,
        headers: JSON.parse(headers),
      } as WebViewSource);
    }
  }, [guest, html, baseUrl, uri, headers]);

  const flat = StyleSheet.flatten(style) ?? {};
  return (
    <View
      style={[
        // React Native's own container, unless a height is given: React
        // Native Web turns `flex: 1` into a flex basis of 0, which would win
        // over the height (AutoHeightWebView's).
        flat.height === undefined ? styles.container : styles.clip,
        style,
      ]}
    >
      <WebviewTag
        ref={element}
        src="about:blank"
        partition={PARTITION}
        webpreferences={javaScriptEnabled ? undefined : 'javascript=no'}
        // Filling the container without sizing it: a web view is 150px tall
        // on its own, as an iframe is, which would hold the container open.
        style={{
          display: 'flex',
          position: 'absolute',
          inset: 0,
          border: 0,
          backgroundColor:
            typeof flat.backgroundColor === 'string'
              ? flat.backgroundColor
              : 'transparent',
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  clip: {
    overflow: 'hidden',
  },
});

export default WebView;
