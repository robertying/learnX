// A Material 3 suggestion chip (the outlined, label-only chip). Display only.
import { StyleSheet, View } from 'react-native';
import {
  CompositionLocalProvider,
  Host,
  SuggestionChip,
  Text,
} from '@expo/ui/jetpack-compose';
import { useComposeColorOverrides, useTheme } from 'theme';
import type { ChipProps } from './Chip.shared';

// The chip's own 32dp, not Material's 48dp touch target, since nothing here is tappable.
const noTouchTarget = { minimumInteractiveComponentSize: 0 };

const Chip: React.FC<ChipProps> = ({ children, style }) => {
  const theme = useTheme();
  const colorOverrides = useComposeColorOverrides();

  return (
    // Compose's chip is always a button: this view swallows taps (no ripple)
    // and reads to TalkBack as plain text instead of a button.
    <View
      style={[styles.container, style]}
      pointerEvents="none"
      collapsable={false}
      accessible
      accessibilityLabel={children}
      importantForAccessibility="no-hide-descendants"
    >
      <Host
        matchContents
        seedColor={theme.colors.primary}
        colorOverrides={colorOverrides}
      >
        <CompositionLocalProvider values={noTouchTarget}>
          <SuggestionChip>
            <SuggestionChip.Label>
              <Text
                maxLines={1}
                overflow="ellipsis"
                style={{ typography: 'labelLarge' }}
              >
                {children}
              </Text>
            </SuggestionChip.Label>
          </SuggestionChip>
        </CompositionLocalProvider>
      </Host>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
  },
});

export default Chip;
