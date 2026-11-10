import { View } from 'react-native';

/** Stand-in for expo-symbols' native SF Symbol view: a view with its testID. */
export const SymbolView = ({ testID }: { testID?: string }) => (
  <View testID={testID} />
);
