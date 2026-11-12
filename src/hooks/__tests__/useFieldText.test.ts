import { act, renderHook } from '@testing-library/react-native';
import { useFieldText } from 'hooks/useFieldText';

it("doesn't write a late value over newer typed text", async () => {
  let fieldText = 'a';
  const text = {
    get: () => fieldText,
    set: jest.fn(),
    onChange: null as ((value: string) => void) | null,
  };
  const onChangeText = jest.fn();
  const { rerender } = await renderHook(
    ({ value }: { value: string }) =>
      useFieldText(text, { value, onChangeText }),
    { initialProps: { value: 'a' } },
  );
  // Two keys reach JS before the first one renders.
  fieldText = 'abc';
  await act(() => {
    text.onChange?.('ab');
    text.onChange?.('abc');
  });
  await rerender({ value: 'ab' });
  await rerender({ value: 'abc' });
  expect(text.set).not.toHaveBeenCalled();
  expect(onChangeText).toHaveBeenLastCalledWith('abc');
  // A value the field never reported, like a cleared draft, is written.
  await rerender({ value: '' });
  expect(text.set).toHaveBeenCalledWith('');
});
