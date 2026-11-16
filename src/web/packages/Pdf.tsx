import { useEffect } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

interface PdfProps {
  style?: StyleProp<ViewStyle>;
  onError?: (error: object) => void;
}

/**
 * Stands in for react-native-pdf in the Electron app, which has no web build:
 * it reports that it can't preview, so the file screen offers its usual
 * "preview failed" state. Chromium's own PDF viewer replaces it (phase 4).
 */
const Pdf = ({ style, onError }: PdfProps) => {
  useEffect(() => {
    onError?.(new Error('No PDF preview in the Electron app yet'));
  }, [onError]);
  return <View style={style} />;
};

export default Pdf;
