import { Component } from 'react';
import type { ErrorInfo } from 'react';
import { View } from 'react-native';
import { reloadAppAsync } from 'expo';
import TextButton from 'components/TextButton';
import StatusView from 'components/StatusView';
import Styles from 'constants/Styles';
import { recordError } from 'helpers/crashReporting';
import { t } from 'helpers/i18n';
import { useTheme } from 'theme';

const ErrorFallback: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => {
  const theme = useTheme();

  return (
    <View style={[Styles.flex1, { backgroundColor: theme.colors.background }]}>
      <StatusView
        testID="error-fallback"
        icon="alert-circle-outline"
        message={t('somethingWentWrong')}
        action={
          <>
            {onRetry ? (
              <TextButton style={Styles.spacey1} onPress={onRetry}>
                {t('tryAgain')}
              </TextButton>
            ) : null}
            <TextButton
              style={Styles.spacey1}
              onPress={() => reloadAppAsync('Error boundary')}
            >
              {t('reloadApp')}
            </TextButton>
          </>
        }
      />
    </View>
  );
};

/**
 * Reports a render error to Crashlytics with its component stack, and shows a
 * way to reload instead of a blank screen. Around a single screen
 * (`navigation/screenLayout`), it can also try that screen
 * again, and the rest of the app stays usable.
 */
export default class ErrorBoundary extends Component<
  React.PropsWithChildren<{ retryable?: boolean }>,
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    recordError(error, `Component stack:${info.componentStack ?? ''}`);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }
    return (
      <ErrorFallback
        onRetry={
          this.props.retryable
            ? () => this.setState({ hasError: false })
            : undefined
        }
      />
    );
  }
}
