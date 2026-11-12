import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import dayjs from 'dayjs';
import { mockLocale } from '../../../jest/locale';
import { NOW, daysFromNow, assignment } from '../../../jest/fixtures/cards';
import AssignmentCard from 'components/AssignmentCard';
import { BrandLightTheme } from 'theme';
import type { Assignment } from 'data/types/state';

// The hues' text shades, which pills draw their text in
const statusText = BrandLightTheme.colors.onStatusContainer;

/** The color of a pill's text. */
const pillColor = (text: string) =>
  StyleSheet.flatten(screen.getByText(text).props.style).color;

beforeEach(() => {
  jest.useFakeTimers({ now: NOW });
});

afterEach(() => {
  jest.useRealTimers();
  mockLocale.current = 'en-US';
  dayjs.locale('en');
});

describe('AssignmentCard', () => {
  it('shows the course, plain-text description and time left', async () => {
    await render(<AssignmentCard data={assignment()} />);
    expect(screen.getByText('Calculus')).toBeTruthy();
    expect(screen.getByText('Problem set 3')).toBeTruthy();
    expect(screen.getByText('Chapters 4 & 5')).toBeTruthy();
    expect(screen.getByText('due in 3 days')).toBeTruthy();
    expect(screen.queryByTestId('due-soon')).toBeNull();
  });

  it('shows the teacher instead of the course inside a course', async () => {
    await render(<AssignmentCard data={assignment()} hideCourseName />);
    expect(screen.queryByText('Calculus')).toBeNull();
    expect(screen.getByText('Prof. Li')).toBeTruthy();
  });

  it('marks a deadline under a day away in red', async () => {
    await render(
      <AssignmentCard
        data={assignment({
          deadline: dayjs(NOW).add(5, 'hour').toISOString(),
        } as Partial<Assignment>)}
      />,
    );
    expect(screen.getByTestId('due-soon')).toBeTruthy();
    expect(pillColor('due in 5 hours')).toEqual(statusText.red);
  });

  it('marks a deadline later tomorrow in orange, as Today does', async () => {
    await render(
      <AssignmentCard
        data={assignment({
          deadline: dayjs(NOW).add(1, 'day').hour(23).minute(59).toISOString(),
        } as Partial<Assignment>)}
      />,
    );
    expect(pillColor('due in 1 day')).toEqual(statusText.orange);
  });

  it('leaves a deadline after tomorrow and a submitted one unmarked', async () => {
    const view = await render(
      <AssignmentCard
        data={assignment({
          deadline: dayjs(NOW).add(2, 'day').hour(0).minute(30).toISOString(),
        } as Partial<Assignment>)}
      />,
    );
    expect(screen.getByText('due in 2 days')).toBeTruthy();
    expect(screen.queryByTestId('due-soon')).toBeNull();

    await view.rerender(
      <AssignmentCard
        data={assignment({
          deadline: dayjs(NOW).add(5, 'hour').toISOString(),
          submitted: true,
        } as Partial<Assignment>)}
      />,
    );
    expect(screen.queryByTestId('due-soon')).toBeNull();
  });

  it('says when a past deadline closed', async () => {
    await render(
      <AssignmentCard
        data={assignment({ deadline: daysFromNow(-2) } as Partial<Assignment>)}
      />,
    );
    expect(screen.getByText('closed 2 days ago')).toBeTruthy();
  });

  it('words the deadline in Chinese', async () => {
    mockLocale.current = 'zh-CN';
    dayjs.locale('zh-cn');
    const view = await render(<AssignmentCard data={assignment()} />);
    expect(screen.getByText('还剩 3 天')).toBeTruthy();

    await view.rerender(
      <AssignmentCard
        data={assignment({ deadline: daysFromNow(-2) } as Partial<Assignment>)}
      />,
    );
    expect(screen.getByText('2 天前截止')).toBeTruthy();
  });

  it('shows submitted and graded assignments as a status', async () => {
    const view = await render(
      <AssignmentCard data={assignment({ submitted: true })} />,
    );
    expect(screen.getByText('Submitted')).toBeTruthy();
    expect(screen.queryByText('due in 3 days')).toBeNull();

    await view.rerender(
      <AssignmentCard
        data={assignment({ submitted: true, graded: true, grade: 80 })}
      />,
    );
    expect(screen.getByText('80')).toBeTruthy();

    await view.rerender(
      <AssignmentCard data={assignment({ submitted: true, graded: true })} />,
    );
    expect(screen.getByText('Graded')).toBeTruthy();
  });

  it('marks a late submission in orange', async () => {
    await render(
      <AssignmentCard
        data={assignment({ submitted: true, isLateSubmission: true })}
      />,
    );
    expect(pillColor('Submitted Late')).toEqual(statusText.orange);
  });

  it('marks a favorite with a red heart', async () => {
    const view = await render(<AssignmentCard data={assignment()} />);
    expect(screen.queryByTestId('icon-favorited')).toBeNull();
    await view.rerender(<AssignmentCard data={assignment()} fav />);
    expect(screen.getByTestId('icon-favorited')).toBeTruthy();
  });

  it('marks attachments and answers', async () => {
    const view = await render(<AssignmentCard data={assignment()} />);
    expect(screen.queryByTestId('icon-attachment')).toBeNull();
    expect(screen.queryByTestId('icon-answer')).toBeNull();

    await view.rerender(
      <AssignmentCard
        data={assignment({
          attachment: { id: 'att' } as Assignment['attachment'],
          answerContent: 'See solutions',
        })}
      />,
    );
    expect(screen.getByTestId('icon-attachment')).toBeTruthy();
    expect(screen.getByTestId('icon-answer')).toBeTruthy();
    expect(
      screen.getByRole('button', {
        name: /^Problem set 3, Calculus, .+, Attachment, Has answer, Chapters 4 & 5$/,
      }),
    ).toBeTruthy();
  });

  it('marks an answer that is only an attachment', async () => {
    await render(
      <AssignmentCard
        data={assignment({
          answerAttachment: { id: 'ans' } as Assignment['answerAttachment'],
        })}
      />,
    );
    expect(screen.getByTestId('icon-answer')).toBeTruthy();
  });

  it('is named for E2E flows', async () => {
    await render(<AssignmentCard data={assignment()} />);
    expect(screen.getByTestId('assignment-card')).toBeOnTheScreen();
  });
});
