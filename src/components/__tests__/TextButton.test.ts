import { withGutter } from 'components/TextButton.shared';

describe('withGutter', () => {
  it('pulls the touch padding into the margins', () => {
    expect(withGutter(undefined, { vertical: 4 })).toEqual([
      undefined,
      { marginTop: -4, marginBottom: -4 },
    ]);
  });

  it("adds to the caller's margins, the most specific one first", () => {
    const style = { margin: 2, marginTop: 10, marginHorizontal: 6 };
    expect(withGutter(style, { vertical: 14, start: 12 })[1]).toEqual({
      marginTop: -4,
      marginBottom: -12,
      marginStart: -6,
    });
  });

  it('treats a percentage margin as none', () => {
    expect(
      withGutter({ marginVertical: '10%' }, { vertical: 4 })[1],
    ).toMatchObject({ marginTop: -4, marginBottom: -4 });
  });
});
