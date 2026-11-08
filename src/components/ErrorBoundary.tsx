import { Component } from 'react';
import type { ErrorInfo } from 'react';
import { StyleSheet, View } from 'react-native';
import Icon from '@react-native-vector-icons/material-icons';
import { reloadAppAsync } from 'expo';
import TextButton from 'components/TextButton';
import { Text } from 'components/Text';
import Styles from 'constants/Styles';
import { recordError } from 'helpers/crashReporting';
import { t } from 'helpers/i18n';
import { useTheme } from 'theme';

const ErrorFallback: React.FC = () => {
  const theme = useTheme();

  return (
    <View
      testID="error-fallback"
      style={[styles.root, { backgroundColor: theme.colors.background }]}
    >
      <Icon
        style={Styles.spacey1}
        name="error-outline"
        color={theme.colors.outline}
        size={56}
      />
      <Text style={[Styles.spacey1, { color: theme.colors.outline }]}>
        {t('somethingWentWrong')}
      </Text>
      <TextButton
        containerStyle={Styles.spacey1}
        onPress={() => reloadAppAsync('Error boundary')}
      >
        {t('reloadApp')}
      </TextButton>
    </View>
  );
};

/**
 * Reports a render error to Crashlytics with its component stack, and shows a
 * way to reload instead of a blank screen.
 */
export default class ErrorBoundary extends Component<
  React.PropsWithChildren,
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
    return this.state.hasError ? <ErrorFallback /> : this.props.children;
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
});
