/**
 * The `navigation` and `route` props for rendering a screen in a test. Give
 * only what the screen uses: `jest.fn()`s for the navigation calls it makes,
 * and the route's `params`.
 */
export const screenProps = ({
  navigation = {},
  route = {},
}: { navigation?: object; route?: object } = {}) => ({
  navigation: navigation as never,
  route: route as never,
});
