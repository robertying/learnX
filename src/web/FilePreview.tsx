import { createElement } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Paths } from 'expo-file-system';
import desktopFileTypes from 'constants/desktopFileTypes.json';

/**
 * Where the preview loads one of learnX's own files from: `app://files/`, an
 * origin of its own that the main process serves PDFs and pictures on
 * (electron/fileShell.cjs), so a file never runs in the app's page. Null for
 * anything outside the app's folders.
 */
export const previewUrlOf = (uri: string) => {
  let roots: [string, string][];
  try {
    // expo-file-system's stand-in, which asks the main process once.
    roots = [
      ['cache', `${Paths.cache.uri.replace(/\/+$/, '')}/`],
      ['document', `${Paths.document.uri.replace(/\/+$/, '')}/`],
    ];
  } catch {
    return null;
  }
  for (const [name, root] of roots) {
    if (uri.startsWith(root)) {
      return `app://files/${name}/${uri.slice(root.length)}`;
    }
  }
  return null;
};

/** A picture of the types the main process serves (not a PDF). */
const isImage = (uri: string) => {
  const extension = /\.([^./]+)$/.exec(uri)?.[1]?.toLowerCase();
  return (
    !!extension &&
    extension !== 'pdf' &&
    Object.hasOwn(desktopFileTypes.preview, extension)
  );
};

/**
 * A downloaded file shown in the Electron app: a PDF in Chromium's own
 * viewer, a picture fitted to the pane.
 */
const FilePreview: React.FC<{
  uri: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}> = ({ uri, style, testID }) => {
  const src = previewUrlOf(uri);
  const name = decodeURIComponent(uri.split('/').pop() ?? '');
  const fill = {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    border: 0,
  } as const;
  return (
    <View style={[styles.container, style]} testID={testID}>
      {src
        ? isImage(uri)
          ? createElement('img', {
              src,
              alt: name,
              draggable: false,
              style: { ...fill, objectFit: 'contain' },
            })
          : createElement('iframe', {
              src,
              title: name,
              style: fill,
            })
        : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
});

export default FilePreview;
