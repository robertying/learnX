import type { ViewProps } from 'react-native';
import { requireNativeView } from 'expo';

export interface PdfViewProps extends ViewProps {
  /** The downloaded PDF, as a `file:` URI. */
  uri: string;
  /** The PDF didn't open: it is damaged, needs a password or isn't a PDF. */
  onError?: (event: { nativeEvent: { message: string } }) => void;
}

/**
 * A downloaded PDF, its pages one under another and fitted to the view's
 * width: PDFKit on iOS and the Mac, Jetpack's PDF viewer on Android.
 */
export const PdfView: React.ComponentType<PdfViewProps> = requireNativeView(
  'LearnXPdf',
  'PdfView',
);
