import {by, element, expect} from 'detox';

const noticesScreenDescription = () => {
  it('should have a screen', async () => {
    await expect(element(by.id('NoticesScreen'))).toBeVisible();
  });

  it('can be scrolled', async () => {
    await element(by.id('FlatList')).swipe('down', 'fast', 0.5);
  });

  it('should change side bar color when swiped horizontally', async () => {
    await element(by.id('InteractableCard'))
      .atIndex(0)
      .swipe('left', 'fast', 0.8);
  });
};

export default noticesScreenDescription;
