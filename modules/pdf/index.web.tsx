import FilePreview from 'web/FilePreview';
import type { PdfViewProps } from './index';

export type { PdfViewProps } from './index';

/**
 * The PDF in Chromium's own viewer, with its toolbar for pages, zoom, search
 * and printing.
 */
export const PdfView = ({ uri, style }: PdfViewProps) => (
  <FilePreview uri={uri} style={style} testID="pdf-preview" />
);
