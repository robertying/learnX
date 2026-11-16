import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { Text } from 'react-native';
// tsc reads the iOS file for 'components/FileDropTarget'; Jest picks this one.
import FileDropTarget, { copyDroppedFile } from 'components/FileDropTarget.web';
import FluentRoot from 'web/FluentRoot';
import { t } from 'helpers/i18n';
import {
  installBridge,
  uninstallBridge,
} from 'test-utils/mocks/electronBridge';

// jsdom has neither; the Electron app's Chromium has both.
Object.assign(globalThis, {
  TextEncoder: require('node:util').TextEncoder,
});
if (!Blob.prototype.arrayBuffer) {
  Blob.prototype.arrayBuffer = function (this: Blob) {
    return new Promise<ArrayBuffer>(resolve => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.readAsArrayBuffer(this);
    });
  };
}

const CACHE = 'file:///data/Caches/';
let bridge: ReturnType<typeof installBridge>;

beforeEach(() => {
  bridge = installBridge();
  jest
    .mocked(bridge.files.sync)
    .mockImplementation(((op: string) =>
      op === 'roots'
        ? { result: { cache: CACHE, document: 'file:///data/Documents/' } }
        : { result: undefined }) as never);
});

afterEach(() => {
  uninstallBridge();
});

/** A drag carrying `files`, as the file manager starts one. */
const drag = (files: File[], types = ['Files']) => ({
  dataTransfer: { types, files, dropEffect: 'none' },
});

const pdf = () =>
  new File(['%PDF'], 'Homework 6: Answers.pdf', { type: 'application/pdf' });

const renderTarget = (
  props: Partial<Parameters<typeof FileDropTarget>[0]> = {},
) => {
  const onDrop = jest.fn();
  const onDropFailed = jest.fn();
  render(
    <FluentRoot>
      <FileDropTarget onDrop={onDrop} onDropFailed={onDropFailed} {...props}>
        <Text>Form</Text>
      </FileDropTarget>
    </FluentRoot>,
  );
  return {
    onDrop,
    onDropFailed,
    target: screen.getByTestId('file-drop-target'),
  };
};

it('copies a dropped file into the cache', async () => {
  const picked = await copyDroppedFile(pdf());
  expect(picked).toEqual({
    uri: expect.stringMatching(
      /^file:\/\/\/data\/Caches\/picked\/\w+\/Homework%206_%20Answers\.pdf$/,
    ),
    name: 'Homework 6_ Answers.pdf',
    type: 'application/pdf',
    size: 4,
  });
  expect(bridge.files.sync).toHaveBeenCalledWith(
    'write',
    picked.uri,
    new Uint8Array([37, 80, 68, 70]),
  );
  const untyped = await copyDroppedFile(new File([''], ''));
  expect(untyped).toMatchObject({ name: '_', type: null });
});

it('says where a dragged file goes, and attaches the first one dropped', async () => {
  const { onDrop, target } = renderTarget();
  expect(screen.getByText('Form')).toBeTruthy();
  fireEvent.dragEnter(target, drag([pdf()]));
  expect(screen.getByText(t('dropToAttach'))).toBeTruthy();
  // Crossing a child enters and leaves it.
  fireEvent.dragEnter(target, drag([pdf()]));
  fireEvent.dragLeave(target, drag([pdf()]));
  expect(screen.getByTestId('file-drop-overlay')).toBeTruthy();
  const over = drag([pdf()]);
  fireEvent.dragOver(target, over);
  await act(async () => {
    fireEvent.drop(target, drag([pdf(), new File(['x'], 'b.txt')]));
  });
  expect(screen.queryByTestId('file-drop-overlay')).toBeNull();
  await waitFor(() => expect(onDrop).toHaveBeenCalledTimes(1));
  expect(onDrop.mock.calls[0][0].name).toBe('Homework 6_ Answers.pdf');
});

it('hides the overlay when the drag leaves', () => {
  const { target } = renderTarget();
  fireEvent.dragEnter(target, drag([pdf()]));
  fireEvent.dragLeave(target, drag([pdf()]));
  expect(screen.queryByTestId('file-drop-overlay')).toBeNull();
});

it('ignores drags of text, and everything while disabled', async () => {
  const { onDrop, target } = renderTarget({ disabled: true });
  fireEvent.dragEnter(target, drag([], ['text/plain']));
  fireEvent.dragOver(target, drag([], ['text/plain']));
  fireEvent.dragLeave(target, drag([], ['text/plain']));
  fireEvent.drop(target, drag([], ['text/plain']));
  fireEvent.dragEnter(target, drag([pdf()]));
  expect(screen.queryByTestId('file-drop-overlay')).toBeNull();
  fireEvent.dragOver(target, drag([pdf()]));
  await act(async () => {
    fireEvent.drop(target, drag([pdf()]));
  });
  expect(onDrop).not.toHaveBeenCalled();
});

it('says when a dropped file couldn’t be copied', async () => {
  const { onDrop, onDropFailed, target } = renderTarget();
  jest
    .mocked(bridge.files.sync)
    .mockReturnValue({ error: 'Disk full' } as never);
  await act(async () => {
    fireEvent.drop(target, drag([pdf()]));
  });
  await waitFor(() => expect(onDropFailed).toHaveBeenCalled());
  expect(onDrop).not.toHaveBeenCalled();
});
