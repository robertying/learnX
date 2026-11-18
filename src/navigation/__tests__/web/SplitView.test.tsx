import { act, fireEvent, render, screen } from '@testing-library/react';
import { useContext } from 'react';
import { Text } from 'react-native';
import Storage from 'expo-sqlite/kv-store';
import SplitSizes from 'constants/SplitSizes';
import { SplitViewContext, SplitViewProvider } from 'navigation/SplitView';

// The in-memory store the phones' tests use, for the Electron app's.
jest.mock('expo-sqlite/kv-store', () =>
  require('test-utils/mocks/sqliteKvStore'),
);

const store = (Storage as unknown as { __store: Map<string, string> }).__store;

const Master = () => {
  const { masterWidth } = useContext(SplitViewContext);
  return <Text testID="master-width">{String(masterWidth)}</Text>;
};

const renderSplit = () =>
  render(
    <SplitViewProvider
      showDetail
      initialTab="A"
      renderDetail={() => <Text>detail</Text>}
    >
      <Master />
    </SplitViewProvider>,
  );

const divider = () => screen.getByTestId('split-divider');
const master = () => screen.getByTestId('split-master');

// jsdom has no pointer capture.
beforeAll(() => {
  HTMLElement.prototype.setPointerCapture = jest.fn();
});
beforeEach(() => store.clear());

// jsdom has no PointerEvent: a mouse event of the pointer's type stands in.
const pointer = (
  type: 'pointerdown' | 'pointermove' | 'pointerup',
  clientX: number,
  button = 0,
) =>
  act(() => {
    fireEvent(
      divider(),
      new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        clientX,
        button,
      }),
    );
  });

it('drags the divider to resize the list, within its limits, and keeps it', async () => {
  const { unmount } = renderSplit();
  expect(master().style.width).toBe(`${SplitSizes.masterWidth}px`);
  expect(divider().getAttribute('aria-valuenow')).toBe(
    String(SplitSizes.masterWidth),
  );

  pointer('pointerdown', 500);
  pointer('pointermove', 600);
  expect(master().style.width).toBe(`${SplitSizes.masterWidth + 100}px`);
  expect(screen.getByTestId('master-width').textContent).toBe(
    String(SplitSizes.masterWidth + 100),
  );
  // Not saved until the drag ends.
  expect(store.get('splitMasterWidth')).toBeUndefined();
  pointer('pointermove', 5000);
  expect(master().style.width).toBe(`${SplitSizes.maxMasterWidth}px`);
  pointer('pointermove', 0);
  expect(master().style.width).toBe(`${SplitSizes.minMasterWidth}px`);
  pointer('pointermove', 550);
  pointer('pointerup', 550);
  expect(store.get('splitMasterWidth')).toBe(
    String(SplitSizes.masterWidth + 50),
  );

  // Moving the pointer after the drag changes nothing.
  pointer('pointermove', 700);
  expect(master().style.width).toBe(`${SplitSizes.masterWidth + 50}px`);

  unmount();
  renderSplit();
  expect(master().style.width).toBe(`${SplitSizes.masterWidth + 50}px`);
});

it('moves with the arrow keys and goes back to the default on a double click', async () => {
  renderSplit();
  act(() => {
    fireEvent.keyDown(divider(), { key: 'ArrowRight' });
  });
  expect(master().style.width).toBe(`${SplitSizes.masterWidth + 16}px`);
  act(() => {
    fireEvent.keyDown(divider(), { key: 'End' });
  });
  expect(master().style.width).toBe(`${SplitSizes.maxMasterWidth}px`);
  expect(store.get('splitMasterWidth')).toBe(String(SplitSizes.maxMasterWidth));
  act(() => {
    fireEvent.keyDown(divider(), { key: 'Home' });
  });
  expect(master().style.width).toBe(`${SplitSizes.minMasterWidth}px`);
  act(() => {
    fireEvent.keyDown(divider(), { key: 'ArrowLeft' });
  });
  expect(master().style.width).toBe(`${SplitSizes.minMasterWidth}px`);
  // Other keys are left to the page.
  act(() => {
    fireEvent.keyDown(divider(), { key: 'a' });
  });

  act(() => {
    fireEvent.click(divider(), { detail: 2 });
  });
  expect(master().style.width).toBe(`${SplitSizes.masterWidth}px`);
  expect(store.get('splitMasterWidth')).toBe(String(SplitSizes.masterWidth));
});

it('ignores a drag with another button, and a press or click that moves nothing', async () => {
  renderSplit();
  pointer('pointerdown', 500, 2);
  pointer('pointermove', 600);
  pointer('pointerup', 600);
  expect(master().style.width).toBe(`${SplitSizes.masterWidth}px`);

  pointer('pointerdown', 500);
  pointer('pointerup', 500);
  act(() => {
    fireEvent.click(divider(), { detail: 1 });
  });
  expect(store.get('splitMasterWidth')).toBeUndefined();

  // Past the limit, further moves change nothing more.
  pointer('pointerdown', 500);
  pointer('pointermove', 5000);
  pointer('pointermove', 6000);
  pointer('pointerup', 6000);
  expect(store.get('splitMasterWidth')).toBe(String(SplitSizes.maxMasterWidth));
});

it('darkens the line while the pointer is over the divider', () => {
  renderSplit();
  const line = () => getComputedStyle(divider().previousSibling as Element);
  const resting = line().backgroundColor;
  // React makes enter and leave from over and out.
  act(() => {
    fireEvent(divider(), new MouseEvent('pointerover', { bubbles: true }));
  });
  const hovered = line().backgroundColor;
  expect(hovered).not.toBe(resting);
  act(() => {
    fireEvent(
      divider(),
      new MouseEvent('pointerout', {
        bubbles: true,
        relatedTarget: document.body,
      }),
    );
  });
  expect(line().backgroundColor).toBe(resting);
});
