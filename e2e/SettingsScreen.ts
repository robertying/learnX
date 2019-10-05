import {by, element, expect} from 'detox';

const settingsScreenDescription = () => {
  it('should change to SettingsScreen when the tab is pressed', async () => {
    await element(by.id('SettingTab')).tap();
    await expect(element(by.id('SettingsScreen'))).toBeVisible();
  });
};

export default settingsScreenDescription;
