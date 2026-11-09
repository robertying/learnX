import { act, renderHook } from '@testing-library/react-native';
import useListSelection from 'hooks/useListSelection';

const a = { id: 'a' };
const b = { id: 'b' };
const c = { id: 'c' };

const setup = (items: { id: string }[]) =>
  renderHook(useListSelection, { initialProps: items });

describe('useListSelection', () => {
  it('counts and reports only checked items still in the list', async () => {
    const { result, rerender } = await setup([a, b]);
    await act(async () => {
      result.current.toggleSelectionMode();
      result.current.setChecked('a', true);
      result.current.setChecked('b', true);
    });
    expect(result.current.selectedCount).toBe(2);

    // b is archived from elsewhere while selection mode is on.
    await rerender([a]);
    expect(result.current.selectedCount).toBe(1);
    expect(result.current.checkedIdsRef.current).toEqual(['a']);
  });

  it('checks a new item on Select all instead of unchecking everything', async () => {
    const { result, rerender } = await setup([a, b]);
    await act(async () => {
      result.current.toggleSelectionMode();
      result.current.checkAll();
    });
    expect(result.current.selectedCount).toBe(2);

    // A refresh brings in c.
    await rerender([a, b, c]);
    expect(result.current.selectedCount).toBe(2);
    await act(async () => result.current.checkAll());
    expect(result.current.checkedIdsRef.current).toEqual(['a', 'b', 'c']);

    await act(async () => result.current.checkAll());
    expect(result.current.selectedCount).toBe(0);
  });

  it('clears the selection when selection mode turns off', async () => {
    const { result } = await setup([a, b]);
    await act(async () => {
      result.current.toggleSelectionMode();
      result.current.setChecked('a', true);
    });
    await act(async () => result.current.toggleSelectionMode());
    expect(result.current.selectionMode).toBe(false);
    expect(result.current.selectedCount).toBe(0);
  });
});
