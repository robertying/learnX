import { Dimensions } from 'react-native';

const get = Dimensions.get.bind(Dimensions);

/**
 * Sets the text size setting for the rest of the test (Jest's React Native
 * reports a font scale of 2), as both `useWindowDimensions` and
 * `useFontScale` (components/Text) read it. Read again on each render, so it
 * takes effect at the next one.
 */
export const setFontScale = (fontScale: number) =>
  jest
    .spyOn(Dimensions, 'get')
    .mockImplementation(dim => ({ ...get(dim), fontScale }));
