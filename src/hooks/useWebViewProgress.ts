import { useState } from 'react';
import type { WebViewProgressEvent } from 'react-native-webview/lib/WebViewTypes';

/**
 * A web view's load progress, for a progress bar over it: `loading` while a
 * page is partly loaded, and `onLoadProgress` for the web view.
 */
const useWebViewProgress = () => {
  const [progress, setProgress] = useState(0);

  return {
    progress,
    loading: progress !== 0 && progress !== 1,
    onLoadProgress: ({ nativeEvent }: WebViewProgressEvent) =>
      // Rounded: the new architecture rejects some native floats.
      setProgress(parseFloat(nativeEvent.progress.toFixed(2))),
  };
};

export default useWebViewProgress;
