import { cardMenuAnchor } from 'helpers/cardMenuAnchor';

describe('cardMenuAnchor', () => {
  it("is the touch's page position in the card's box", () => {
    expect(
      cardMenuAnchor({ pageX: 120, pageY: 230 }, { left: 0, top: 200 }),
    ).toEqual({ x: 120, y: 30 });
  });

  it('is unknown without a touch or a box', () => {
    expect(cardMenuAnchor(undefined, { left: 0, top: 0 })).toBeUndefined();
    expect(cardMenuAnchor({ pageX: 1, pageY: 2 }, undefined)).toBeUndefined();
    expect(
      cardMenuAnchor({ pageX: NaN, pageY: 2 }, { left: 0, top: 0 }),
    ).toBeUndefined();
  });
});
