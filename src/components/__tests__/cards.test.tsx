import { render, screen } from '@testing-library/react-native';
import dayjs from 'dayjs';
import { mockLocale } from '../../../jest/locale';
import { Assignment, Course, File, Notice } from 'data/types/state';
import AssignmentCard from 'components/AssignmentCard';
import CourseCard from 'components/CourseCard';
import FileCard from 'components/FileCard';
import NoticeCard from 'components/NoticeCard';

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
  it('shows the course, title, plain-text content, publisher and age', async () => {
    await render(<NoticeCard data={notice()} />);
    expect(screen.getByText('Calculus')).toBeTruthy();
    expect(screen.getByText('Midterm room change')).toBeTruthy();
    expect(screen.getByText('Moved to Room 101')).toBeTruthy();
    expect(screen.getByText('TA Wang')).toBeTruthy();
    expect(screen.getByText('2 days ago')).toBeTruthy();
  });

  it('leaves out the course name inside a course', async () => {
    await render(<NoticeCard data={notice()} hideCourseName />);
    expect(screen.queryByText('Calculus')).toBeNull();
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
    expect(screen.queryByTestId('icon-checkbox-blank-circle')).toBeNull();

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
    expect(screen.getByTestId('icon-checkbox-blank-circle')).toBeTruthy();
  });
});

describe('AssignmentCard', () => {
  it('shows the teacher, plain-text description and time left', async () => {
    await render(<AssignmentCard data={assignment()} />);
    expect(screen.getByText('Calculus')).toBeTruthy();
    expect(screen.getByText('Problem set 3')).toBeTruthy();
    expect(screen.getByText('Chapters 4 & 5')).toBeTruthy();
    expect(screen.getByText('Prof. Li')).toBeTruthy();
    expect(screen.getByText('due in 3 days')).toBeTruthy();
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

  it('marks attachments, submission, grade, answers and excellent work', async () => {
    const view = await render(<AssignmentCard data={assignment()} />);
    for (const icon of [
      'attachment',
      'check',
      'grade',
      'key-variant',
      'medal',
    ]) {
      expect(screen.queryByTestId(`icon-${icon}`)).toBeNull();
    }

    await view.rerender(
      <AssignmentCard
        data={assignment({
          attachment: { id: 'att' } as Assignment['attachment'],
          submitted: true,
          graded: true,
          answerContent: 'See solutions',
          excellentHomeworkList: [
            { id: 'e1' },
          ] as Assignment['excellentHomeworkList'],
        })}
      />,
    );
    for (const icon of [
      'attachment',
      'check',
      'grade',
      'key-variant',
      'medal',
    ]) {
      expect(screen.getByTestId(`icon-${icon}`)).toBeTruthy();
    }
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
  it('shows the category, type, size and upload age', async () => {
    await render(<FileCard data={file()} />);
    expect(screen.getByText('Lecture 5 slides')).toBeTruthy();
    expect(screen.getByText('Slides PDF 2.1 MB')).toBeTruthy();
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
    expect(screen.queryByTestId('icon-checkbox-blank-circle')).toBeNull();

    await view.rerender(
      <FileCard data={file({ markedImportant: true, isNew: true })} />,
    );
    expect(screen.getByTestId('icon-flag')).toBeTruthy();
    expect(screen.getByTestId('icon-checkbox-blank-circle')).toBeTruthy();
  });
});

describe('CourseCard', () => {
  it('shows the course with its unread and unfinished counts', async () => {
    await render(<CourseCard data={course} />);
    expect(screen.getByText('Prof. Li')).toBeTruthy();
    expect(screen.getByText('Calculus')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByText('1')).toBeTruthy();
    expect(screen.getByText('0')).toBeTruthy();
  });
});
