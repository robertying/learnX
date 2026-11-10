import { ActionSheetIOS, Alert, Platform } from 'react-native';
import { act, render, screen, userEvent } from '@testing-library/react-native';
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

const os = Platform.OS;

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
  Platform.OS = os;
  saveSubmissionDraft(unsubmitted.id, null);
});

it('shows Not Found for an assignment no longer listed', async () => {
  await renderScreen(null as never);
  expect(screen.getByText(t('itemNotFound'))).toBeTruthy();
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

it('picks from documents or photos in an action sheet on iOS', async () => {
  Platform.OS = 'ios';
  const sheet = jest
    .spyOn(ActionSheetIOS, 'showActionSheetWithOptions')
    .mockImplementation(() => {});
  await renderScreen();
  await userEvent.press(screen.getByTestId('pickAttachment'));
  expect(picker.openMenu).toHaveBeenCalled();
  const choose = sheet.mock.calls[0][1];
  choose(0);
  expect(picker.pickDocument).toHaveBeenCalled();
  choose(1);
  expect(picker.pickPhoto).toHaveBeenCalled();
  choose(2);
  expect(picker.closeMenu).toHaveBeenCalled();
});

it('asks in an alert on Android, closing the menu when dismissed', async () => {
  Platform.OS = 'android';
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await renderScreen();
  await userEvent.press(screen.getByTestId('pickAttachment'));
  const [, , buttons, options] = alert.mock.calls[0];
  expect(buttons!.map(b => b.text)).toEqual([
    t('cancel'),
    t('photos'),
    t('documents'),
  ]);
  buttons![2].onPress!();
  expect(picker.pickDocument).toHaveBeenCalled();
  options!.onDismiss!();
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
