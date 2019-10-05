import {by, element, expect} from 'detox';

const filesScreenDescription = () => {
  it('should change to FilesScreen when the tab is pressed', async () => {
    await element(by.id('FileTab')).tap();
    await expect(element(by.id('FilesScreen'))).toBeVisible();
  });
};

export default filesScreenDescription;
