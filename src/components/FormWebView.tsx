import { useState } from 'react';
import AutoHeightWebView from 'components/AutoHeightWebView';
import { FormView, type FormRowPosition } from 'components/Form';
import { getWebViewTemplate } from 'helpers/html';
import { useTheme, webContentColors } from 'theme';

/**
 * Course-site HTML (a notice's body, an assignment's description) in a form
 * row, in the theme's text colors on the row's own background, with a
 * spinner until it has rendered.
 */
const FormWebView: React.FC<{
  content: string;
  /** Set by `FormSection` on Android, for the row's corners. */
  position?: FormRowPosition;
}> = ({ content, position }) => {
  const theme = useTheme();
  const [ready, setReady] = useState(false);
  const html = getWebViewTemplate(content, {
    dark: theme.dark,
    // The form row's own color shows through.
    backgroundColor: 'transparent',
    ...webContentColors(theme.dark),
  });
  return (
    <FormView loading={!ready} position={position}>
      <AutoHeightWebView source={{ html }} onReady={() => setReady(true)} />
    </FormView>
  );
};

export default FormWebView;
