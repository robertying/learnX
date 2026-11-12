import { act, render, screen } from '@testing-library/react-native';
import type * as ReactNative from 'react-native';
import { StyleSheet } from 'react-native';
import dayjs from 'dayjs';
import { mockLocale } from '../../../jest/locale';
import { NOW, notice } from '../../../jest/fixtures/cards';
import NoticeCard from 'components/NoticeCard';
import type { Notice } from 'data/types/state';

const RN: typeof ReactNative = require('react-native');

beforeEach(() => {
  jest.useFakeTimers({ now: NOW });
});

afterEach(() => {
  jest.useRealTimers();
  mockLocale.current = 'en-US';
  dayjs.locale('en');
});

describe('NoticeCard', () => {
  it('sets the title in regular weight, read or not; the dot marks unread', async () => {
    await render(<NoticeCard data={notice({ hasRead: false })} />);
    expect(
      StyleSheet.flatten(screen.getByText('Midterm room change').props.style)
        .fontWeight,
    ).toBe('400');
    expect(screen.getByTestId('unread-dot')).toBeTruthy();
  });

  it('wraps the title only at accessibility text sizes', async () => {
    const dimensions = jest.spyOn(RN, 'useWindowDimensions');
    dimensions.mockReturnValue({
      width: 400,
      height: 800,
      scale: 2,
      fontScale: 1,
    });
    const view = await render(<NoticeCard data={notice()} />);
    expect(screen.getByText('Midterm room change').props.numberOfLines).toBe(1);
    await view.unmount();
    dimensions.mockReturnValue({
      width: 400,
      height: 800,
      scale: 2,
      fontScale: 2,
    });
    await render(<NoticeCard data={notice()} />);
    expect(screen.getByText('Midterm room change').props.numberOfLines).toBe(3);
    dimensions.mockRestore();
  });

  it('shows the course, title, plain-text content and weekday', async () => {
    await render(<NoticeCard data={notice()} />);
    expect(screen.getByText('Calculus')).toBeTruthy();
    expect(screen.getByText('Midterm room change')).toBeTruthy();
    expect(screen.getByText('Moved to Room 101')).toBeTruthy();
    expect(screen.getByText('Sunday')).toBeTruthy();
  });

  it('shows the time today and turns to yesterday at midnight', async () => {
    await render(
      <NoticeCard
        data={notice({
          publishTime: dayjs(NOW).subtract(3, 'minute').toISOString(),
        })}
      />,
    );
    expect(screen.getByText('11:57')).toBeTruthy();

    // past midnight
    await act(() => jest.advanceTimersByTime(12 * 60 * 60_000 + 60_000));
    expect(screen.getByText('Yesterday')).toBeTruthy();
  });

  it('shows the publisher instead of the course inside a course', async () => {
    await render(<NoticeCard data={notice()} hideCourseName />);
    expect(screen.queryByText('Calculus')).toBeNull();
    expect(screen.getByText('TA Wang')).toBeTruthy();
    expect(screen.getByText('Midterm room change')).toBeTruthy();
  });

  it('leaves out the content line when the notice has no text', async () => {
    await render(<NoticeCard data={notice({ content: '<p> </p>' })} />);
    expect(screen.queryByText(/Room/)).toBeNull();
  });

  it('marks attachments, importance and unread notices', async () => {
    const view = await render(<NoticeCard data={notice()} />);
    expect(screen.queryByTestId('icon-attachment')).toBeNull();
    expect(screen.queryByTestId('icon-important')).toBeNull();
    expect(screen.queryByTestId('unread-dot')).toBeNull();

    await view.rerender(
      <NoticeCard
        data={notice({
          attachment: { id: 'att', name: 'room.pdf' } as Notice['attachment'],
          markedImportant: true,
          hasRead: false,
        })}
      />,
    );
    expect(screen.getByTestId('icon-attachment')).toBeTruthy();
    expect(screen.getByTestId('icon-important')).toBeTruthy();
    expect(screen.getByTestId('unread-dot')).toBeTruthy();
  });

  it('tells screen readers the title first, then what only shows', async () => {
    await render(
      <NoticeCard
        data={notice({
          attachment: { id: 'att', name: 'room.pdf' } as Notice['attachment'],
          markedImportant: true,
          hasRead: false,
        })}
      />,
    );
    expect(
      screen.getByRole('button', {
        name: 'Unread, Midterm room change, Calculus, Sunday, Attachment, Important, Moved to Room 101',
      }),
    ).toBeTruthy();
  });

  it('shortens a long preview for screen readers', async () => {
    await render(<NoticeCard data={notice({ content: 'x'.repeat(500) })} />);
    expect(
      screen.getByRole('button', {
        name: `Midterm room change, Calculus, Sunday, ${'x'.repeat(120)}…`,
      }),
    ).toBeTruthy();
  });

  it('is named for E2E flows', async () => {
    await render(<NoticeCard data={notice()} />);
    expect(screen.getByTestId('notice-card')).toBeOnTheScreen();
  });
});
