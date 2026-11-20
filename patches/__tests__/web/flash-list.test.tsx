// What patches/@shopify__flash-list@2.3.3.patch changes on the web: a list
// that isn't laid out (in a hidden tab, or under another screen) measures
// nothing, instead of measuring every row as 0 px tall and rendering them all.
import { render, screen } from '@testing-library/react';
import { Text } from 'react-native';
import { FlashList } from '@shopify/flash-list';

const items = Array.from({ length: 100 }, (_, i) => `row ${i}`);

const renderList = () =>
  render(
    <FlashList
      data={items}
      renderItem={({ item }) => <Text>{item}</Text>}
      keyExtractor={item => item}
    />,
  );

const renderedRows = () => screen.queryAllByText(/^row \d+$/).length;

// jsdom has no layout: every element has no box and measures 0, as one in a
// `display: none` subtree does in the app.
it('renders no rows while the list is hidden', () => {
  renderList();
  expect(renderedRows()).toBe(0);
});

it('renders only the rows near the viewport once laid out', () => {
  // Every element laid out and 100 px tall: a 100 px list of 100 px rows.
  jest
    .spyOn(Element.prototype, 'getClientRects')
    .mockReturnValue([new DOMRect(0, 0, 320, 100)] as unknown as DOMRectList);
  jest.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(100);
  jest.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(320);
  renderList();
  expect(renderedRows()).toBeGreaterThan(0);
  expect(renderedRows()).toBeLessThan(20);
});
