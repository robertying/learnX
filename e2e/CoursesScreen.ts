import {by, element, expect} from 'detox';

const coursesScreenDescription = () => {
  it('should change to CoursesScreen when the tab is pressed', async () => {
    await element(by.id('CourseTab')).tap();
    await expect(element(by.id('CoursesScreen'))).toBeVisible();
  });
};

export default coursesScreenDescription;
