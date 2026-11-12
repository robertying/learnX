import { act, render, screen } from '@testing-library/react-native';
import dayjs from 'dayjs';
import { mockLocale } from 'test-utils/locale';
import { NOW, file } from 'test-utils/fixtures/cards';
import FileCard from 'components/FileCard';
import type { File } from 'data/types/state';

beforeEach(() => {
  jest.useFakeTimers({ now: NOW });
});

afterEach(() => {
  jest.useRealTimers();
  mockLocale.current = 'en-US';
  dayjs.locale('en');
});

describe('FileCard', () => {
  it('shows the time today and turns to yesterday at midnight', async () => {
    await render(
      <FileCard
        data={file({
          uploadTime: dayjs(NOW).subtract(3, 'minute').toISOString(),
        })}
      />,
    );
    expect(screen.getByText('11:57')).toBeTruthy();

    // past midnight
    await act(() => jest.advanceTimersByTime(12 * 60 * 60_000 + 60_000));
    expect(screen.getByText('Yesterday')).toBeTruthy();
  });

  it('shows the category, type, size and upload day', async () => {
    await render(<FileCard data={file()} />);
    expect(screen.getByText('Lecture 5 slides')).toBeTruthy();
    expect(screen.getByText('Slides · PDF · 2.1 MB')).toBeTruthy();
    // the type is in the details: no tile repeats it
    expect(screen.queryByText('PDF')).toBeNull();
    expect(screen.getByText('Yesterday')).toBeTruthy();
  });

  it('drops a missing category or type from the details', async () => {
    await render(
      <FileCard
        data={file({
          category: undefined,
          fileType: undefined,
        } as unknown as Partial<File>)}
      />,
    );
    expect(screen.getByText('2.1 MB')).toBeTruthy();
  });

  it('marks important and new files', async () => {
    const view = await render(<FileCard data={file()} />);
    expect(screen.queryByTestId('icon-important')).toBeNull();
    expect(screen.queryByTestId('unread-dot')).toBeNull();

    await view.rerender(
      <FileCard data={file({ markedImportant: true, isNew: true })} />,
    );
    expect(screen.getByTestId('icon-important')).toBeTruthy();
    expect(screen.getByTestId('unread-dot')).toBeTruthy();
    expect(
      screen.getByRole('button', {
        name: 'Unread, Lecture 5 slides, Calculus, Yesterday, Important, Slides · PDF · 2.1 MB',
      }),
    ).toBeTruthy();
  });

  it('is named for E2E flows', async () => {
    await render(<FileCard data={file()} />);
    expect(screen.getByTestId('file-card')).toBeOnTheScreen();
  });
});
