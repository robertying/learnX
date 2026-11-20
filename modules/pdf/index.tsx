import type { ViewProps } from 'react-native';
import { requireNativeView } from 'expo';

/** Why a PDF didn't open. */
export type PdfFailure = 'password' | 'unreadable';

export interface PdfViewProps extends ViewProps {
  /** The downloaded PDF, as a `file:` URI. */
  uri: string;
  /**
   * The file's name. Android's Pdfium view (before Android 15) says it to
   * TalkBack with the page; the other viewers describe themselves.
   */
  title?: string;
  /**
   * The PDF didn't open: it needs a password (`password`), or it is damaged
   * or isn't a PDF (`unreadable`).
   */
  onError?: (event: { nativeEvent: { reason: PdfFailure } }) => void;
}

/**
 * A downloaded PDF, its pages one under another and fitted to the view's
 * width: PDFKit on iOS and the Mac, Jetpack's PDF viewer on Android.
 */
export const PdfView: React.ComponentType<PdfViewProps> = requireNativeView(
  'LearnXPdf',
  'PdfView',
);
