import { StyleSheet, View } from 'react-native';

/**
 * What an empty list shows (`Empty`, a spinner), centered behind the list
 * rather than in it, as in a `UITableView`'s `backgroundView`. Put it before
 * the list, which draws over it and still pulls to refresh.
 *
 * Inside the list it would have to stretch the content to the list's height
 * (`flexGrow`), and iOS adds the header's and tab bar's insets on top of
 * that (`contentInsetAdjustmentBehavior`), so the list would scroll with
 * nothing in it.
 */
const ListBackground: React.FC<React.PropsWithChildren> = ({ children }) => (
  <View style={styles.root}>{children}</View>
);

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ListBackground;
