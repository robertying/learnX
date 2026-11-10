import { areRowPropsEqual, shallowEqual } from 'helpers/rowProps';

describe('row props', () => {
  it('compares objects by their own keys', () => {
    const fn = () => {};
    expect(shallowEqual({ a: 1, b: fn }, { a: 1, b: fn })).toBe(true);
    expect(shallowEqual({ a: 1 }, { a: 2 })).toBe(false);
    expect(shallowEqual({ a: 1 }, { a: 1, b: undefined })).toBe(false);
    expect(shallowEqual({ a: NaN }, { a: NaN })).toBe(true);
  });

  it('compares the item by its fields and the rest by identity', () => {
    const actions = {};
    expect(
      areRowPropsEqual(
        { data: { id: 'a', count: 1 }, actions, checked: false },
        { data: { id: 'a', count: 1 }, actions, checked: false },
      ),
    ).toBe(true);
    expect(
      areRowPropsEqual(
        { data: { id: 'a', count: 1 }, actions, checked: false },
        { data: { id: 'a', count: 2 }, actions, checked: false },
      ),
    ).toBe(false);
    expect(
      areRowPropsEqual(
        { data: { id: 'a' }, actions, checked: false },
        { data: { id: 'a' }, actions, checked: true },
      ),
    ).toBe(false);
    expect(
      areRowPropsEqual(
        { data: { id: 'a' }, actions },
        { data: { id: 'a' }, actions: {} },
      ),
    ).toBe(false);
  });
});
