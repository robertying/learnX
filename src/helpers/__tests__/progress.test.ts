import { clampProgress, percentLabel } from 'helpers/progress';

describe('clampProgress', () => {
  it('holds a value between 0 and 1', () => {
    expect(clampProgress(-0.2)).toBe(0);
    expect(clampProgress(0.4)).toBe(0.4);
    expect(clampProgress(1.5)).toBe(1);
  });
});

describe('percentLabel', () => {
  it('is a whole percentage once progress starts', () => {
    expect(percentLabel(undefined)).toBe('');
    expect(percentLabel(0)).toBe('');
    expect(percentLabel(0.426)).toBe('43%');
    expect(percentLabel(1.2)).toBe('100%');
  });
});
