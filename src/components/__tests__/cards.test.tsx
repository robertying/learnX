import { render, screen } from '@testing-library/react-native';
import dayjs from 'dayjs';
import { mockLocale } from '../../../jest/locale';
import { Assignment, Course, File, Notice } from 'data/types/state';
import AssignmentCard from 'components/AssignmentCard';
import CourseCard from 'components/CourseCard';
import FileCard from 'components/FileCard';
import NoticeCard from 'components/NoticeCard';
import { FileTypeTile } from 'components/CardRow';

const NOW = new Date('2026-03-10T12:00:00+08:00');

const daysFromNow = (days: number) => dayjs(NOW).add(days, 'day').toISOString();

const notice = (overrides: Partial<Notice> = {}) =>
  ({
    id: 'n1',
    courseId: 'c1',
    courseName: 'Calculus',
    courseTeacherName: 'Prof. Li',
    title: 'Midterm room change',
    content: '<p>Moved to <b>Room&nbsp;101</b></p>',
    publisher: 'TA Wang',
    publishTime: daysFromNow(-2),
    markedImportant: false,
    hasRead: true,
    ...overrides,
  }) as Notice;

const assignment = (overrides: Partial<Assignment> = {}) =>
  ({
    id: 'a1',
    courseId: 'c1',
    courseName: 'Calculus',
    courseTeacherName: 'Prof. Li',
    title: 'Problem set 3',
    description: '<p>Chapters 4 &amp; 5</p>',
    deadline: daysFromNow(3),
    submitted: false,
    graded: false,
    ...overrides,
  }) as Assignment;

const file = (overrides: Partial<File> = {}) =>
  ({
    id: 'f1',
    courseId: 'c1',
    courseName: 'Calculus',
    courseTeacherName: 'Prof. Li',
    title: 'Lecture 5 slides',
    description: '',
    size: '2.1 MB',
    fileType: 'pdf',
    markedImportant: false,
    isNew: false,
    uploadTime: daysFromNow(-1),
    category: { id: 'cat', title: 'Slides' },
    ...overrides,
  }) as File;

const course = {
  id: 'c1',
  name: 'Calculus',
  teacherName: 'Prof. Li',
  semesterId: '2025-2026-2',
  unreadNoticeCount: 2,
  unfinishedAssignmentCount: 1,
  unreadFileCount: 0,
} as Course & {
  unreadNoticeCount: number;
  unfinishedAssignmentCount: number;
  unreadFileCount: number;
};

beforeEach(() => {
  jest.useFakeTimers({ now: NOW });
});

afterEach(() => {
  jest.useRealTimers();
  mockLocale.current = 'en-US';
  dayjs.locale('en');
});

describe('NoticeCard', () => {
  it('shows the course, title, plain-text content and age', async () => {
    await render(<NoticeCard data={notice()} />);
    expect(screen.getByText('Calculus')).toBeTruthy();
    expect(screen.getByText('Midterm room change')).toBeTruthy();
    expect(screen.getByText('Moved to Room 101')).toBeTruthy();
    expect(screen.getByText('2 days ago')).toBeTruthy();
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
    expect(screen.queryByTestId('icon-flag')).toBeNull();
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
    expect(screen.getByTestId('icon-flag')).toBeTruthy();
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
        name: 'Unread, Midterm room change, Calculus, 2 days ago, Attachment, Important, Moved to Room 101',
      }),
    ).toBeTruthy();
  });

  it('shortens a long preview for screen readers', async () => {
    await render(<NoticeCard data={notice({ content: 'x'.repeat(500) })} />);
    expect(
      screen.getByRole('button', {
        name: `Midterm room change, Calculus, 2 days ago, ${'x'.repeat(120)}…`,
      }),
    ).toBeTruthy();
  });
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

  it('highlights a deadline due by the end of tomorrow', async () => {
    await render(
      <AssignmentCard
        data={assignment({
          deadline: dayjs(NOW).add(5, 'hour').toISOString(),
        } as Partial<Assignment>)}
      />,
    );
    expect(screen.getByTestId('due-soon')).toBeTruthy();
    expect(screen.getByText('due in 5 hours')).toBeTruthy();
  });

  it('highlights a deadline late tomorrow, as Today does', async () => {
    await render(
      <AssignmentCard
        data={assignment({
          deadline: dayjs(NOW).add(1, 'day').hour(23).minute(59).toISOString(),
        } as Partial<Assignment>)}
      />,
    );
    expect(screen.getByTestId('due-soon')).toBeTruthy();
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

  it('marks attachments and answers', async () => {
    const view = await render(<AssignmentCard data={assignment()} />);
    expect(screen.queryByTestId('icon-attachment')).toBeNull();
    expect(screen.queryByTestId('icon-key-variant')).toBeNull();

    await view.rerender(
      <AssignmentCard
        data={assignment({
          attachment: { id: 'att' } as Assignment['attachment'],
          answerContent: 'See solutions',
        })}
      />,
    );
    expect(screen.getByTestId('icon-attachment')).toBeTruthy();
    expect(screen.getByTestId('icon-key-variant')).toBeTruthy();
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
    expect(screen.getByTestId('icon-key-variant')).toBeTruthy();
  });
});

describe('FileCard', () => {
  it('shows the type, category, size and upload age', async () => {
    await render(<FileCard data={file()} />);
    expect(screen.getByText('Lecture 5 slides')).toBeTruthy();
    expect(screen.getByText('Slides · PDF · 2.1 MB')).toBeTruthy();
    expect(screen.getByText('PDF')).toBeTruthy();
    expect(screen.getByText('a day ago')).toBeTruthy();
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
    expect(screen.queryByTestId('icon-flag')).toBeNull();
    expect(screen.queryByTestId('unread-dot')).toBeNull();

    await view.rerender(
      <FileCard data={file({ markedImportant: true, isNew: true })} />,
    );
    expect(screen.getByTestId('icon-flag')).toBeTruthy();
    expect(screen.getByTestId('unread-dot')).toBeTruthy();
    expect(
      screen.getByRole('button', {
        name: 'Unread, Lecture 5 slides, Calculus, a day ago, Important, Slides · PDF · 2.1 MB',
      }),
    ).toBeTruthy();
  });
});

describe('CourseCard', () => {
  it('shows the course with only the counts that are not zero', async () => {
    await render(<CourseCard data={course} />);
    expect(screen.getByText('Prof. Li')).toBeTruthy();
    expect(screen.getByText('Calculus')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByText('1')).toBeTruthy();
    expect(screen.queryByText('0')).toBeNull();
    expect(
      screen.getByRole('button', {
        name: 'Calculus, Prof. Li, 2 unread notices, 1 unfinished assignment',
      }),
    ).toBeTruthy();
  });
});

describe('FileTypeTile', () => {
  it('keeps a four-letter type on one line', async () => {
    await render(<FileTypeTile fileType="docx" />);
    expect(screen.getByText('DOCX').props.numberOfLines).toBe(1);
  });
});
