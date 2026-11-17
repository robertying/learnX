import { createElement } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { bridge } from 'web/bridge';

/**
 * Where the preview loads one of learnX's own files from: `app://files/`, an
 * origin of its own that the main process serves PDFs and pictures on
 * (electron/fileShell.cjs), so a file never runs in the app's page. Null for
 * anything outside the app's folders.
 */
export const previewUrlOf = (uri: string) => {
  const answer = bridge().files.sync('roots');
  if ('error' in answer) {
    return null;
  }
  for (const [name, root] of Object.entries(answer.result)) {
    if (uri.startsWith(root)) {
      return `app://files/${name}/${uri.slice(root.length)}`;
    }
  }
  return null;
};

const isImage = (uri: string) =>
  /\.(png|jpe?g|gif|webp|bmp|avif|ico)$/i.test(uri);

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
              alt: '',
              draggable: false,
              style: { ...fill, objectFit: 'contain' },
            })
          : createElement('iframe', {
              src,
              title: decodeURIComponent(uri.split('/').pop() ?? ''),
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
