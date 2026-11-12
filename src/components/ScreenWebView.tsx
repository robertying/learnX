import type { ReactNode, Ref } from 'react';
import { Platform, StyleSheet } from 'react-native';
import WebView, { type WebViewProps } from 'react-native-webview';
import PageProgressBar from 'components/PageProgressBar';
import SafeArea from 'components/SafeArea';
import useWebViewProgress from 'hooks/useWebViewProgress';

/**
 * A screen that is a web page (Changelog, CourseX, the SSO page): the page on
 * the screen's background, below the header and under its glass from iOS 26,
 * scrolling as Safari does on iOS, with its loading progress over its top.
 * `children` go after it, such as a toolbar; `loading` says whether a page is
 * partly loaded.
 */
const ScreenWebView: React.FC<
  Omit<WebViewProps, 'children'> & {
    ref?: Ref<WebView>;
    children?: (state: { loading: boolean }) => ReactNode;
  }
> = ({ ref, children, style, onLoadProgress, ...props }) => {
  const progress = useWebViewProgress();
  return (
    <SafeArea>
      {progress.loading ? (
        <PageProgressBar progress={progress.progress} />
      ) : null}
      <WebView
        ref={ref}
        style={[styles.webView, style]}
        decelerationRate={Platform.OS === 'ios' ? 'normal' : undefined}
        contentInsetAdjustmentBehavior="automatic"
        onLoadProgress={event => {
          progress.onLoadProgress(event);
          onLoadProgress?.(event);
        }}
        {...props}
      />
      {children?.({ loading: progress.loading })}
    </SafeArea>
  );
};

const styles = StyleSheet.create({
  webView: {
    backgroundColor: 'transparent',
  },
});

export default ScreenWebView;
