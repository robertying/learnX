import type { StyleProp, ViewStyle } from 'react-native';
import FilePreview from 'web/FilePreview';

interface PdfProps {
  source: { uri: string };
  style?: StyleProp<ViewStyle>;
  onError?: (error: object) => void;
}

/**
 * Stands in for react-native-pdf in the Electron app, which has no web build:
 * the PDF shows in Chromium's own viewer, with its toolbar for pages, zoom,
 * search and printing.
 */
const Pdf = ({ source, style }: PdfProps) => (
  <FilePreview uri={source.uri} style={style} testID="pdf-preview" />
);

export default Pdf;
