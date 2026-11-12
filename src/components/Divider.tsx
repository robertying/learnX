import { StyleSheet } from 'react-native';
import { Divider as NativeDivider, HStack } from '@expo/ui/swift-ui';
import ThemedHost from 'components/ThemedHost';
import type { DividerProps } from './Divider.shared';

export type { DividerProps } from './Divider.shared';

/**
 * The system separator (SwiftUI `Divider`). It is horizontal on its own and
 * vertical inside an `HStack`, which then fills the height of the host.
 */
const Divider: React.FC<DividerProps> = ({ vertical, style }) => (
  <ThemedHost
    matchContents={vertical ? { horizontal: true } : { vertical: true }}
    style={[styles.stretch, style]}
  >
    {vertical ? (
      <HStack>
        <NativeDivider />
      </HStack>
    ) : (
      <NativeDivider />
    )}
  </ThemedHost>
);

const styles = StyleSheet.create({
  stretch: {
    alignSelf: 'stretch',
  },
});

export default Divider;
