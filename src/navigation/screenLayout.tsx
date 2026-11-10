import ErrorBoundary from 'components/ErrorBoundary';

/**
 * Every stack's `screenLayout`: a screen that fails to render shows an error
 * in its place, with the tabs, the list and the other panes still usable.
 */
export const screenLayout = ({ children }: { children: React.ReactNode }) => (
  <ErrorBoundary retryable>{children}</ErrorBoundary>
);
