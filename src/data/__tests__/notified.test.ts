import { addNotifiedKeys, getNotifiedKeys, resetNotified } from 'data/notified';

beforeEach(resetNotified);

describe('notified keys', () => {
  it('remembers keys once, newest last', () => {
    addNotifiedKeys(['a', 'b']);
    addNotifiedKeys(['a', 'c']);
    expect([...getNotifiedKeys()]).toEqual(['b', 'a', 'c']);
  });

  it('keeps the store as it is when nothing is added', () => {
    addNotifiedKeys(['a']);
    const before = getNotifiedKeys();
    addNotifiedKeys([]);
    expect(getNotifiedKeys()).toEqual(before);
  });

  it('forgets the oldest keys past 3000', () => {
    addNotifiedKeys(Array.from({ length: 3001 }, (_, i) => `k${i}`));
    const keys = getNotifiedKeys();
    expect(keys.size).toBe(3000);
    expect(keys.has('k0')).toBe(false);
    expect(keys.has('k3000')).toBe(true);
  });
});
