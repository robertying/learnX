import dayjs from 'dayjs';
import { Alert } from 'react-native';
import { act, render, screen, userEvent } from '@testing-library/react-native';
import { showChoices } from 'components/choiceSheet';
import { toast } from 'components/Toast';
import { mockAssignments } from 'data/mock';
import { saveSubmissionDraft } from 'data/submissionDrafts';
import type { Assignment } from 'data/types/state';
import { t } from 'helpers/i18n';
import {
  useAttachmentPicker,
  useSaveSubmissionDraft,
  useSubmitAssignment,
} from 'hooks/useAssignmentSubmission';
import AssignmentSubmission from 'screens/AssignmentSubmission';

jest.mock('components/Toast', () => ({ toast: jest.fn() }));
jest.mock('components/choiceSheet', () => ({ showChoices: jest.fn() }));
let mockAssignment: Assignment | undefined;
jest.mock('data/content', () => ({ useAssignment: () => mockAssignment }));
jest.mock('hooks/useAssignmentSubmission', () => ({
  useAttachmentPicker: jest.fn(),
  useSaveSubmissionDraft: jest.fn(),
  useSubmitAssignment: jest.fn(),
}));

const picker = {
  picked: null as null | { uri: string; type: string; name: string },
  isShared: false,
  openMenu: jest.fn(),
  closeMenu: jest.fn(),
  pickDocument: jest.fn(),
  pickPhoto: jest.fn(),
  removePicked: jest.fn(),
};
const stop = jest.fn();
const submit = {
  uploading: false,
  uploadError: false,
  dismissUploadError: jest.fn(),
  progress: 0,
  confirmSubmit: jest.fn(),
};

const unsubmitted = mockAssignments.find(
  a => !a.submitted && !a.submittedAttachment,
)!;
const withUpload = mockAssignments.find(a => !!a.submittedAttachment)!;

const navigation = {
  setOptions: jest.fn(),
  push: jest.fn(),
  goBack: jest.fn(),
};

const renderScreen = (assignment: Assignment | undefined = unsubmitted) => {
  mockAssignment = assignment;
  return render(
    <AssignmentSubmission
      navigation={navigation as never}
      route={{ params: { id: assignment?.id ?? 'gone' } } as never}
    />,
  );
};

/** The header's submit button, as a native item. */
const submitItem = () =>
  navigation.setOptions.mock.calls
    .findLast(([o]) => o.unstable_headerRightItems)![0]
    .unstable_headerRightItems()[0] as {
    disabled: boolean;
    onPress: () => void;
  };

beforeEach(() => {
  picker.picked = null;
  picker.isShared = false;
  jest
    .mocked(useAttachmentPicker)
    .mockImplementation(() => ({ ...picker }) as never);
  jest.mocked(useSaveSubmissionDraft).mockReturnValue({ stop } as never);
  jest
    .mocked(useSubmitAssignment)
    .mockImplementation(() => ({ ...submit }) as never);
});

afterEach(() => {
  saveSubmissionDraft(unsubmitted.id, null);
});

it('shows Not Found for an assignment no longer listed', async () => {
  await renderScreen(null as never);
  expect(screen.getByText(t('itemNotFound'))).toBeTruthy();
});

it('names the assignment and its deadline at the top', async () => {
  const deadline = dayjs().add(3, 'day');
  await renderScreen({
    ...unsubmitted,
    deadline: deadline.toISOString(),
    lateSubmissionDeadline: undefined,
  });
  expect(screen.getByText(unsubmitted.title)).toBeTruthy();
  expect(
    screen.getByText(deadline.format(t('fullDateTimeFormat')), {
      exact: false,
    }),
  ).toBeTruthy();
  expect(screen.queryByText(t('lateSubmission'), { exact: false })).toBeNull();
});

it('adds the late deadline once the deadline has passed', async () => {
  const late = dayjs().add(2, 'day');
  await renderScreen({
    ...unsubmitted,
    deadline: dayjs().subtract(1, 'day').toISOString(),
    lateSubmissionDeadline: late.toISOString(),
  });
  expect(
    screen.getByText(
      `${t('lateSubmission')} ${late.format(t('fullDateTimeFormat'))}`,
      { exact: false },
    ),
  ).toBeTruthy();
});

it('submits only once there is something to send', async () => {
  const user = userEvent.setup();
  await renderScreen();
  expect(submitItem().disabled).toBe(true);
  await user.type(screen.getByTestId('submissionContent'), 'My answer');
  expect(submitItem().disabled).toBe(false);
  submitItem().onPress();
  expect(submit.confirmSubmit).toHaveBeenCalled();
});

it('stops saving the draft and goes back once submitted', async () => {
  await renderScreen();
  const onDone = jest.mocked(useSubmitAssignment).mock.calls[0][2];
  onDone();
  expect(stop).toHaveBeenCalled();
  expect(navigation.goBack).toHaveBeenCalled();
});

it('picks from documents or photos, closing the menu when cancelled', async () => {
  await renderScreen();
  await userEvent.press(screen.getByTestId('pickAttachment'));
  expect(picker.openMenu).toHaveBeenCalled();
  const { title, choices, onCancel } =
    jest.mocked(showChoices).mock.calls[0][0];
  expect(title).toBe(t('pickAttachment'));
  expect(choices.map(choice => choice.label)).toEqual([
    t('documents'),
    t('photos'),
  ]);
  choices[0].onPress();
  expect(picker.pickDocument).toHaveBeenCalled();
  choices[1].onPress();
  expect(picker.pickPhoto).toHaveBeenCalled();
  onCancel!();
  expect(picker.closeMenu).toHaveBeenCalled();
});

it('shows a picked file, which can be renamed, opened or removed', async () => {
  picker.picked = {
    uri: 'file:///a.pdf',
    type: 'application/pdf',
    name: 'a.pdf',
  };
  picker.isShared = true;
  const user = userEvent.setup();
  await renderScreen();
  expect(screen.getByText(t('reUploadAttachment'))).toBeTruthy();
  expect(
    screen.getByText(t('previouslyShared'), { exact: false }),
  ).toBeTruthy();
  expect(submitItem().disabled).toBe(false);

  await user.press(screen.getByText('a.pdf', { exact: false }));
  expect(navigation.push).toHaveBeenCalledWith('FileDetail', {
    attachment: expect.objectContaining({ title: 'a', fileType: 'pdf' }),
  });
  await user.press(screen.getByText(t('removePickedAttachment')));
  expect(picker.removePicked).toHaveBeenCalled();
});

it('opens the uploaded file under its own id', async () => {
  const user = userEvent.setup();
  await renderScreen(withUpload);
  await user.press(screen.getByText(withUpload.submittedAttachment!.name));
  expect(navigation.push).toHaveBeenCalledWith('FileDetail', {
    attachment: expect.objectContaining({
      id: withUpload.submittedAttachment!.id,
      courseId: withUpload.courseId,
    }),
  });
});

it('removes the uploaded file, and undoes that', async () => {
  const user = userEvent.setup();
  await renderScreen(withUpload);
  expect(screen.getByText(t('overwriteAttachment'))).toBeTruthy();
  await user.press(screen.getByText(t('removeUploadedAttachment')));
  expect(screen.queryByTestId('pickAttachment')).toBeNull();
  expect(submitItem().disabled).toBe(false);
  await user.press(screen.getByText(t('undoRemoveUploadedAttachment')));
  expect(screen.getByTestId('pickAttachment')).toBeTruthy();
});

it('shows progress while uploading, and a failure as a toast', async () => {
  jest
    .mocked(useSubmitAssignment)
    .mockImplementation(
      () => ({ ...submit, uploading: true, progress: 0.5 }) as never,
    );
  await renderScreen();
  expect(screen.getByText(t('uploadingSubmission'))).toBeTruthy();
  expect(submitItem().disabled).toBe(true);

  jest
    .mocked(useSubmitAssignment)
    .mockImplementation(() => ({ ...submit, uploadError: true }) as never);
  await renderScreen();
  expect(toast).toHaveBeenCalledWith(
    t('assignmentSubmissionFailed'),
    'error',
    3000,
  );
  expect(submit.dismissUploadError).toHaveBeenCalled();
});

it('restores a draft and discards it once confirmed', async () => {
  saveSubmissionDraft(unsubmitted.id, {
    content: 'Saved answer',
    customAttachmentName: '',
    removeAttachment: false,
    picked: null,
  } as never);
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await renderScreen();
  expect(screen.getByDisplayValue('Saved answer')).toBeTruthy();
  expect(screen.getByText(t('draftSaved'))).toBeTruthy();

  await userEvent.press(screen.getByText(t('discardDraft')));
  await act(() => alert.mock.calls[0][2]![1].onPress!());
  expect(screen.queryByDisplayValue('Saved answer')).toBeNull();
  expect(picker.removePicked).toHaveBeenCalled();
});
