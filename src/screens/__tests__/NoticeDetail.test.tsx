import { render, screen, userEvent } from '@testing-library/react-native';
import dayjs from 'dayjs';
import { mockNotices } from 'data/mock';
import { openNotice } from 'data/serverActions';
import type { Notice } from 'data/types/state';
import { t } from 'helpers/i18n';
import NoticeDetail from 'screens/NoticeDetail';

jest.mock('data/source', () => ({
  dataSource: { getCSRFToken: () => 'token' },
}));
jest.mock('data/serverActions', () => ({ openNotice: jest.fn() }));
jest.mock('components/AutoHeightWebView', () => {
  const { Text } = require('react-native');
  return ({ source }: { source: { html: string } }) => (
    <Text testID="content">{source.html}</Text>
  );
});
let mockNotice: Notice | undefined;
jest.mock('data/content', () => ({ useNotice: () => mockNotice }));

const navigation = { setOptions: jest.fn(), push: jest.fn() };
const renderScreen = (notice: Notice | undefined) => {
  mockNotice = notice;
  return render(
    <NoticeDetail
      navigation={navigation as never}
      route={{ params: { id: notice?.id ?? 'gone' } } as never}
    />,
  );
};

const withAttachment = mockNotices.find(n => !!n.attachment)!;

it('shows Not Found for a notice no longer listed', async () => {
  await renderScreen(undefined);
  expect(screen.getByText(t('itemNotFound'))).toBeTruthy();
  expect(openNotice).not.toHaveBeenCalled();
});

it('shows the notice and marks it read', async () => {
  await renderScreen(withAttachment);
  expect(screen.getByText(withAttachment.title)).toBeTruthy();
  expect(navigation.setOptions).toHaveBeenCalledWith(
    expect.objectContaining({ title: withAttachment.courseName }),
  );
  expect(openNotice).toHaveBeenCalledWith(
    withAttachment.id,
    withAttachment.url,
  );
  expect(screen.getByTestId('content').props.children).toContain(
    withAttachment.content,
  );
});

it('opens the attachment as a file', async () => {
  await renderScreen(withAttachment);
  await userEvent.press(screen.getByText(withAttachment.attachment!.name));
  expect(navigation.push).toHaveBeenCalledWith('FileDetail', {
    attachment: expect.objectContaining({
      id: withAttachment.id,
      title: withAttachment.attachment!.name.replace(/\.[^.]+$/, ''),
    }),
  });
});

it('says when it expires or expired, and when it has no content', async () => {
  const future = dayjs().add(3, 'day');
  await renderScreen({
    ...withAttachment,
    publisher: '',
    content: '',
    expireTime: future.toISOString(),
  });
  expect(
    screen.getByText(future.format(t('noticeExpireTimeFormat')), {
      exact: false,
    }),
  ).toBeTruthy();
  expect(screen.getByText(t('noNoticeContent'))).toBeTruthy();
  expect(screen.queryByTestId('content')).toBeNull();

  const past = dayjs().subtract(3, 'day');
  await renderScreen({ ...withAttachment, expireTime: past.toISOString() });
  expect(
    screen.getByText(past.format(t('noticeExpiredTimeFormat')), {
      exact: false,
    }),
  ).toBeTruthy();
});
