import { render, screen, userEvent } from '@testing-library/react-native';
import { HomeworkSubmissionType } from '@robertying/thu-learn-lib';
import dayjs from 'dayjs';
import { mockAssignments } from 'data/mock';
import { saveSubmissionDraft } from 'data/submissionDrafts';
import type { Assignment } from 'data/types/state';
import { getAssignmentGradeLevelDescription, t } from 'helpers/i18n';
import useDetailNavigator from 'hooks/useDetailNavigator';
import AssignmentDetail from 'screens/AssignmentDetail';

jest.mock('data/source', () => ({
  dataSource: { getCSRFToken: () => 'token' },
}));
jest.mock('components/AutoHeightWebView', () => {
  const { Text } = require('react-native');
  return ({ source }: { source: { html: string } }) => (
    <Text testID="description">{source.html}</Text>
  );
});
let mockAssignment: Assignment | undefined;
jest.mock('data/content', () => ({
  useAssignment: () => mockAssignment,
  useExcellentHomeworkDetail: (homework: object) => homework,
}));
jest.mock('hooks/useDetailNavigator', () => jest.fn(() => undefined));

const find = (predicate: (a: Assignment) => boolean) => {
  const found = mockAssignments.find(predicate);
  if (!found) {
    throw new Error('No such mock assignment');
  }
  return found;
};

const navigation = {
  setOptions: jest.fn(),
  push: jest.fn(),
  navigate: jest.fn(),
};

const renderScreen = (assignment: Assignment | undefined) => {
  mockAssignment = assignment;
  return render(
    <AssignmentDetail
      navigation={navigation as never}
      route={{ params: { id: assignment?.id ?? 'gone' } } as never}
    />,
  );
};

/** The header's submit button, as a native item. */
const submitButton = () => {
  const call = navigation.setOptions.mock.calls.find(
    ([options]) => options.unstable_headerRightItems,
  );
  return call?.[0].unstable_headerRightItems()[0] as
    | { disabled: boolean; onPress: () => void }
    | undefined;
};

it('shows Not Found for an assignment no longer listed', async () => {
  await renderScreen(undefined);
  expect(screen.getByText(t('itemNotFound'))).toBeTruthy();
});

it('titles the page with its course and shows its description', async () => {
  const open = find(a => !a.submitted && !!a.attachment);
  await renderScreen(open);
  expect(navigation.setOptions).toHaveBeenCalledWith(
    expect.objectContaining({ title: open.courseName }),
  );
  expect(screen.getByText(open.title)).toBeTruthy();
  expect(screen.getByText(t('notSubmitted'))).toBeTruthy();
  expect(screen.getByTestId('description').props.children).toContain(
    open.description,
  );
});

it('submits from the header while open, in a sheet without a detail pane', async () => {
  const open = find(
    a =>
      !a.submitted &&
      a.submissionType !== HomeworkSubmissionType.OFFLINE &&
      dayjs(a.deadline).isAfter(dayjs()),
  );
  await renderScreen(open);
  expect(submitButton()?.disabled).toBe(false);
  submitButton()!.onPress();
  expect(navigation.navigate).toHaveBeenCalledWith(
    'AssignmentSubmissionStack',
    {
      screen: 'AssignmentSubmission',
      params: { id: open.id },
    },
  );

  const push = jest.fn();
  jest.mocked(useDetailNavigator).mockReturnValue({ push } as never);
  navigation.setOptions.mockClear();
  await renderScreen(open);
  submitButton()!.onPress();
  expect(push).toHaveBeenCalledWith('AssignmentSubmission', { id: open.id });
  jest.mocked(useDetailNavigator).mockReturnValue(undefined);
});

it('disables submitting once closed, and offers none for paper submissions', async () => {
  await renderScreen(
    find(
      a =>
        a.submissionType !== HomeworkSubmissionType.OFFLINE &&
        dayjs(a.deadline).isBefore(dayjs()),
    ),
  );
  expect(submitButton()?.disabled).toBe(true);

  navigation.setOptions.mockClear();
  await renderScreen(
    find(a => a.submissionType === HomeworkSubmissionType.OFFLINE),
  );
  expect(submitButton()).toBeUndefined();
  expect(
    screen.getByText(t('assignmentOfflineSubmission'), { exact: false }),
  ).toBeTruthy();
});

it('shows a grade level, or the score', async () => {
  const leveled = find(a => a.graded && !!a.gradeLevel);
  await renderScreen(leveled);
  // The detail ends the row's text.
  const detail = (text: string) => new RegExp(` ${text}$`);
  expect(
    screen.getByText(
      detail(getAssignmentGradeLevelDescription(leveled.gradeLevel!)),
    ),
  ).toBeTruthy();

  const scored = find(a => a.graded && !a.gradeLevel && a.grade !== undefined);
  await renderScreen(scored);
  expect(screen.getByText(detail(String(scored.grade)))).toBeTruthy();
});

it('opens attachments as files, named without their extension', async () => {
  const withFile = find(a => !!a.attachment);
  await renderScreen(withFile);
  await userEvent.press(screen.getByText(withFile.attachment!.name));
  expect(navigation.push).toHaveBeenCalledWith('FileDetail', {
    attachment: expect.objectContaining({
      id: withFile.attachment!.id,
      courseName: withFile.courseName,
      title: withFile.attachment!.name.replace(/\.[^.]+$/, ''),
      fileType: withFile.attachment!.name.split('.').pop(),
    }),
  });
});

it('lists excellent homework, keeping anonymous authors anonymous', async () => {
  const withExcellent = find(a => !!a.excellentHomeworkList?.length);
  await renderScreen(withExcellent);
  expect(screen.getByText(t('excellentHomework'))).toBeTruthy();
  expect(
    screen.getByText(t('excellentHomeworkBy', { name: t('anonymous') })),
  ).toBeTruthy();
  const first = withExcellent.excellentHomeworkList![0];
  await userEvent.press(screen.getByText(first.submittedAttachment!.name));
  expect(navigation.push).toHaveBeenCalledWith(
    'FileDetail',
    expect.objectContaining({
      attachment: expect.objectContaining({
        id: first.submittedAttachment!.id,
      }),
    }),
  );
});

it('shows the answer and what was submitted', async () => {
  const answered = find(a => !!a.answerAttachment);
  await renderScreen(answered);
  expect(screen.getByText(t('answer'))).toBeTruthy();
  expect(screen.getByText(answered.answerAttachment!.name)).toBeTruthy();

  const submitted = find(a => a.submitted && !!a.submittedAttachment);
  await renderScreen(submitted);
  expect(screen.getByText(t('yourSubmission'))).toBeTruthy();
  expect(screen.getByText(submitted.submittedAttachment!.name)).toBeTruthy();
});

it('links an unsent draft to the submission page', async () => {
  const open = find(
    a =>
      !a.submitted &&
      a.submissionType !== HomeworkSubmissionType.OFFLINE &&
      dayjs(a.deadline).isAfter(dayjs()),
  );
  saveSubmissionDraft(open.id, { content: 'half done' } as never);
  await renderScreen(open);
  await userEvent.press(screen.getByText(t('unsentDraft')));
  expect(navigation.navigate).toHaveBeenCalledWith(
    'AssignmentSubmissionStack',
    expect.anything(),
  );
  saveSubmissionDraft(open.id, null);
});
