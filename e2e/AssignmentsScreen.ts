import {by, element, expect} from 'detox';

const assignmentsScreenDescription = () => {
  it('should change to AssignmentsScreen when the tab is pressed', async () => {
    await element(by.id('AssignmentTab')).tap();
    await expect(element(by.id('AssignmentsScreen'))).toBeVisible();
  });
};

export default assignmentsScreenDescription;
