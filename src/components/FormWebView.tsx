import { useMemo, useState } from 'react';
import AutoHeightWebView from 'components/AutoHeightWebView';
import { FormView, type FormRowPosition } from 'components/Form';
import { getWebViewTemplate } from 'helpers/html';
import { loadsFromWebLearning } from 'helpers/learnUrl';
import useWebSession from 'hooks/useWebSession';
import { useTheme, webContentColors } from 'theme';

/**
 * Course-site HTML (a notice's body, an assignment's description) in a form
 * row, in the theme's text colors on the row's own background, with a
 * spinner until it has rendered. Content with images from Web Learning waits
 * for a login under way and loads again after a new one (`useWebSession`),
 * so they don't break when the screen opens as the app starts or comes back.
 */
const FormWebView: React.FC<{
  content: string;
  /** Set by `FormSection` on Android, for the row's corners. */
  position?: FormRowPosition;
}> = ({ content, position }) => {
  const theme = useTheme();
  const [ready, setReady] = useState(false);
  const needsSession = useMemo(() => loadsFromWebLearning(content), [content]);
  const csrfToken = useWebSession(needsSession);
  return (
    <FormView loading={!ready} position={position}>
      {/* Nothing while it waits for a login: the spinner shows. */}
      <>
        {csrfToken !== null && (
          <AutoHeightWebView
            source={{
              html: getWebViewTemplate(
                content,
                {
                  dark: theme.dark,
                  // The form row's own color shows through.
                  backgroundColor: 'transparent',
                  ...webContentColors(theme.dark),
                },
                csrfToken,
              ),
            }}
            onReady={() => setReady(true)}
          />
        )}
      </>
    </FormView>
  );
};

export default FormWebView;
