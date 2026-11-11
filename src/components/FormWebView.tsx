import { useState } from 'react';
import AutoHeightWebView from 'components/AutoHeightWebView';
import { FormView, type FormRowPosition } from 'components/Form';

/** HTML content in a form row, with a spinner until it has rendered. */
const FormWebView: React.FC<{
  html: string;
  /** Set by `FormSection` on Android, for the row's corners. */
  position?: FormRowPosition;
}> = ({ html, position }) => {
  const [ready, setReady] = useState(false);
  return (
    <FormView loading={!ready} position={position}>
      <AutoHeightWebView source={{ html }} onReady={() => setReady(true)} />
    </FormView>
  );
};

export default FormWebView;
