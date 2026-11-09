import {
  HomeworkCompletionType,
  HomeworkGradeLevel,
  HomeworkSubmissionType,
  type RemoteFile,
} from '@robertying/thu-learn-lib';
import dayjs from 'dayjs';
import { Assignment, Course, File, Notice, User } from 'data/types/state';
import type { UserData } from 'data/userData';

/*
 * What the mock account sees. Made to look like a real Electronic Engineering
 * student's term, so every screen and state can be reviewed and store
 * screenshots look real: courses with Chinese and English names, notices with
 * attachments, links, tables, images and math, assignments in every state
 * (due soon, overdue, late, submitted, graded with a score, a level or
 * feedback, excellent homework) and files of many types.
 *
 * Course names are real Tsinghua course names; every person's name is made up.
 * All dates are relative to the current time, so the data always looks fresh.
 */

// --- Time helpers -------------------------------------------------------------

const at = (days: number, hour: number, minute: number) =>
  dayjs().add(days, 'day').hour(hour).minute(minute).second(0).millisecond(0);
/** An ISO time `days` from today at `hour`:`minute` (assignment times). */
const iso = (days: number, hour: number, minute: number) =>
  at(days, hour, minute).toISOString();
/**
 * The same with the device's offset. The real server writes notice and file
 * times in Beijing time without a zone; the mock keeps its times relative to
 * the device instead, so they look the same in any time zone.
 */
const dateTime = (days: number, hour: number, minute: number) =>
  at(days, hour, minute).format();
/** `hours` before now, with the device's offset. */
const hoursAgo = (hours: number) => dayjs().subtract(hours, 'hour').format();
const monthDay = (d: dayjs.Dayjs) => `${d.month() + 1}月${d.date()}日`;
const sundayText = `${monthDay(dayjs().day(7))}（周日）`;
const roomChangeDay = monthDay(dayjs().add(9, 'day'));
const examDay = dayjs().add(16, 'day');
const lastMonday = `${monthDay(dayjs().subtract(8, 'day').day(1))}（周一）`;

// --- Files the mock data links to ---------------------------------------------

/**
 * Sample files in this repo's `mock-files` (built by its `generate.py`), so
 * downloads and previews show real content of the right type.
 */
const MOCK_FILES =
  'https://raw.githubusercontent.com/robertying/learnX/main/mock-files/';

const samples = {
  lecturePdf: { file: 'human-visual-system.pdf', size: '102.83KB' },
  handoutPdf: { file: 'project1-handout.pdf', size: '44.92KB' },
  solutionPdf: { file: 'homework-solution.pdf', size: '35.96KB' },
  labDocx: { file: 'lab-report-template.docx', size: '36.21KB' },
  dataXlsx: { file: 'fir-measurements.xlsx', size: '5.31KB' },
  slidesPptx: { file: 'deep-learning-frameworks.pptx', size: '33.40KB' },
  audioZip: { file: 'dtmf-signals.zip', size: '74.09KB' },
  timingPng: { file: 'counter-timing.png', size: '26.05KB' },
  scopeMp4: { file: 'scope-demo.mp4', size: '147.07KB' },
};
type Sample = keyof typeof samples;

const sampleUrl = (sample: Sample) => MOCK_FILES + samples[sample].file;

/** An attachment of a notice or assignment. */
const attachment = (id: string, name: string, sample: Sample): RemoteFile => ({
  id,
  name,
  downloadUrl: sampleUrl(sample),
  previewUrl: sampleUrl(sample),
  size: samples[sample].size,
});

const noticeUrl = (id: string) => `https://www.example.com/notice/${id}`;
const assignmentUrl = (id: string) => `https://www.example.com/homework/${id}`;

// --- Account and semesters --------------------------------------------------

/** What the emulated server answers for the account and its semesters. */
export const mockUser: User = {
  name: '陈思远',
  department: '电子工程系',
};

export const mockSemesters: string[] = [
  '2026-2027-1',
  '2025-2026-2',
  '2025-2026-1',
];

export const mockCurrentSemester = '2026-2027-1';
const previousSemester = '2025-2026-2';

/** The current semester began on the Monday eight weeks ago: this is week 9. */
export const mockSemesterStart = dayjs()
  .startOf('day')
  .subtract((dayjs().day() + 6) % 7, 'day')
  .subtract(8, 'week');

// --- Courses ------------------------------------------------------------------

const course = (
  semesterId: string,
  id: string,
  chineseName: string,
  englishName: string,
  teacherName: string,
  courseNumber: string,
  timeAndLocation: string[],
): Course => ({
  semesterId,
  id: `${semesterId}${id}`,
  name: chineseName,
  chineseName,
  englishName,
  teacherName,
  teacherNumber: `20${courseNumber.slice(2)}12`,
  courseNumber,
  courseIndex: 0,
  timeAndLocation,
});

const quantum = course(
  mockCurrentSemester,
  '151000102',
  '量子与统计',
  'Quantum and Statistical Physics',
  '林启航',
  '40230612',
  ['星期二第1节(全周)，六教6A118', '星期四第1节(全周)，六教6A118'],
);
const communication = course(
  mockCurrentSemester,
  '151000215',
  '通信与网络',
  'Communication and Networks',
  '宋闻溪',
  '40230972',
  ['星期一第1节(全周)，六教6C300', '星期四第3节(全周)，六教6C300'],
);
const probability = course(
  mockCurrentSemester,
  '151000330',
  '概率论与随机过程(2)',
  'Probability and Stochastic Processes (2)',
  '许嘉禾',
  '40230752',
  ['星期一第3节(1-16周)，四教4101', '星期五第2节(1-16周)，四教4101'],
);
const audioVisual = course(
  mockCurrentSemester,
  '151000447',
  '视听信息系统导论',
  'Introduction to Audio-Visual Information Systems',
  '方书语',
  '40230892',
  ['星期三第4节(全周)，五教5102'],
);
const digitalSystem = course(
  mockCurrentSemester,
  '151000561',
  '数字系统设计',
  'Digital System Design',
  '秦立衡',
  '40230823',
  ['星期二第3节(全周)，东主楼9-105', '星期四第5节(前八周)，东主楼9-105'],
);
const dsp = course(
  mockCurrentSemester,
  '151000678',
  '基于数字信号处理器的系统设计',
  'System Design Based on Digital Signal Processors',
  '顾承远',
  '40231002',
  ['星期五第4节(后八周)，五教5201', '星期三第6节(全周)，五教5201'],
);
const electronicSystem = course(
  mockCurrentSemester,
  '151000784',
  '电子系统设计',
  'Electronic System Design',
  '邵清和',
  '40230373',
  ['星期二第6节(全周)，东主楼10-103', '星期五第1节(全周)，东主楼10-103'],
);
const machineLearning = course(
  mockCurrentSemester,
  '151000893',
  '机器学习概论',
  'Introduction to Machine Learning',
  '姜以宁',
  '40250182',
  ['星期三第2节(全周)，三教3200'],
);
const engineeringGraphics = course(
  mockCurrentSemester,
  '151000925',
  '工程图学基础',
  'Fundamentals of Engineering Graphics',
  '温雅琳',
  '30130173',
  ['星期一第2节(全周)，李兆基科技大楼A302', '星期三第1节(单周)，三教2300'],
);
// A weekend course, so Today has classes on any day of the week.
const swimming = course(
  mockCurrentSemester,
  '151001036',
  '游泳（提高班）',
  'Swimming (Advanced)',
  '夏子川',
  '10720061',
  [
    '星期六第1节(9,11周)，陈明游泳馆',
    '星期六第2节(9,11周)，陈明游泳馆',
    '星期日第1节(9,11周)，陈明游泳馆',
    '星期日第2节(9,11周)，陈明游泳馆',
  ],
);
// No time and location, as the server lists research courses; hidden.
const research = course(
  mockCurrentSemester,
  '151001142',
  '实验室科研探究(3)',
  'Laboratory Research Exploration (3)',
  '罗知微',
  '40230093',
  ['星期第0节(全周)，'],
);
const signals = course(
  previousSemester,
  '150900118',
  '信号与系统',
  'Signals and Systems',
  '韩若谷',
  '40230133',
  ['星期二第2节(全周)，六教6A017', '星期四第2节(全周)，六教6A017'],
);
const circuits = course(
  previousSemester,
  '150900246',
  '电路原理',
  'Principles of Electric Circuits',
  '黎慕白',
  '40230443',
  ['星期一第2节(全周)，三教3100', '星期三第3节(全周)，三教3100'],
);
const dataStructures = course(
  previousSemester,
  '150900371',
  '数据结构',
  'Data Structures',
  '钟以恒',
  '30240184',
  ['星期五第3节(全周)，六教6B208'],
);

export const mockCourses: Course[] = [
  quantum,
  communication,
  probability,
  audioVisual,
  digitalSystem,
  dsp,
  electronicSystem,
  machineLearning,
  engineeringGraphics,
  swimming,
  research,
  signals,
  circuits,
  dataStructures,
];

/** The fields the app adds to every item from its course. */
const of = (c: Course) => ({
  courseId: c.id,
  courseName: c.name,
  courseTeacherName: c.teacherName,
});

// --- Notices ------------------------------------------------------------------

const noticeId = (n: number) =>
  `26ef84e76d60efc1016d${n.toString(16).padStart(12, '0')}`;

const notice = (
  n: number,
  c: Course,
  fields: Omit<Notice, 'id' | 'url' | keyof ReturnType<typeof of>>,
): Notice => ({
  id: noticeId(n),
  url: noticeUrl(noticeId(n)),
  ...fields,
  ...of(c),
});

/** A first-week course introduction, so every course has a notice. */
const introNotice = (n: number, c: Course, body: string, weekAgo = 8): Notice =>
  notice(n, c, {
    title: '课程介绍与考核方式',
    publisher: c.teacherName,
    hasRead: true,
    markedImportant: false,
    publishTime: dateTime(-7 * weekAgo, 10, 5),
    content: `<p>各位同学好！欢迎选修本课程。</p><p>${body}</p><p>课程答疑时间为每周四下午 4:00–5:30，地点见课程大纲。有问题也可以在网络学堂课程讨论区留言。</p>`,
  });

export const mockNotices: Notice[] = [
  notice(1, quantum, {
    title: '请按照助教的安排交作业（不要再放到原来的作业箱，以免丢失或延误）',
    publisher: '程一帆',
    hasRead: true,
    markedImportant: false,
    publishTime: hoursAgo(3),
    content:
      '<p>助教已安排好了交作业方式：纸质作业请在周四课前交到讲台上的收作业袋，电子版请在网络学堂提交。</p><p>请不要再交到理科楼的作业箱，以免造成丢失或延误批改。</p>',
  }),
  notice(2, quantum, {
    title: '调课提醒：' + sundayText + '8:00 有课（补周五的课）',
    publisher: quantum.teacherName,
    hasRead: false,
    markedImportant: true,
    publishTime: hoursAgo(26),
    content:
      '<p>根据学校放假调课安排，' +
      sundayText +
      '补上周五的课，量子与统计课时间为早上 <strong>8:00</strong>，地点不变（六教6A118）。</p>',
  }),
  notice(3, audioVisual, {
    title: '第一次大作业',
    publisher: '白若溪',
    hasRead: false,
    markedImportant: false,
    publishTime: dateTime(-2, 16, 22),
    content:
      '<p>第一次大作业已布置，题目是“利用灭点灭线估计建筑物高度”。请同学们仔细阅读附件中的作业说明，注意截止日期，合理安排时间。</p><p>本次作业以小组为单位完成，每组不超过 3 人，请在下周三前把分组名单发给助教。</p>',
    attachment: attachment(
      '1998990181_ZY_17312650012260f4c1a6d-0a3c-4f6e-9b1c-2f7e8a1d5b31',
      '第一次大作业说明.pdf',
      'handoutPdf',
    ),
  }),
  notice(4, probability, {
    title: '期中考试安排',
    publisher: probability.teacherName,
    hasRead: false,
    markedImportant: true,
    publishTime: dateTime(-2, 9, 30),
    expireTime: examDay.hour(23).minute(59).second(0).format(),
    content: `<p>期中考试安排如下，请各位同学按照学号所在考场参加考试，<strong>携带学生证</strong>，提前 15 分钟入场。</p>
<table border="1" cellpadding="4" cellspacing="0" style="width:760px">
  <thead>
    <tr><th>日期</th><th>时间</th><th>学号范围</th><th>考场</th><th>考试范围</th><th>答疑</th></tr>
  </thead>
  <tbody>
    <tr><td>${monthDay(examDay)}</td><td>19:20–21:20</td><td>尾号 0–4</td><td>六教6A015</td><td>第 1–6 讲（随机过程基本概念、平稳过程、泊松过程）</td><td>考前周三晚，四教4101</td></tr>
    <tr><td>${monthDay(examDay)}</td><td>19:20–21:20</td><td>尾号 5–9</td><td>六教6A017</td><td>第 1–6 讲（随机过程基本概念、平稳过程、泊松过程）</td><td>考前周三晚，四教4101</td></tr>
    <tr><td>另行通知</td><td>—</td><td>缓考同学</td><td>—</td><td>同上</td><td>—</td></tr>
  </tbody>
</table>
<p>考试为闭卷，可携带一张 A4 手写公式纸，不得使用计算器。</p>`,
  }),
  notice(5, digitalSystem, {
    title: '实验 4 时序参考图',
    publisher: '唐景行',
    hasRead: false,
    markedImportant: false,
    publishTime: dateTime(-3, 20, 12),
    content: `<p>有同学问到实验 4 中计数器的时序，下面是参考仿真波形。复位释放后，使能信号拉高，计数器在每个时钟上升沿加一：</p>
<p><img alt="4 位同步计数器时序图" src="${sampleUrl('timingPng')}" style="width:800px; height:380px" /></p>
<p>请在实验报告中附上自己的仿真波形，并标出建立时间和保持时间。</p>`,
  }),
  notice(6, machineLearning, {
    title: 'Guest Lecture: Efficient Training of Large Models',
    publisher: machineLearning.teacherName,
    hasRead: true,
    markedImportant: false,
    publishTime: dateTime(-4, 14, 0),
    content: `<p>Dear all,</p>
<p>Next Wednesday's class will be a guest lecture on efficient training of large models, covering mixed precision, gradient checkpointing and data parallelism. Attendance counts toward participation.</p>
<p>Before class, please skim the official tutorials at <a href="https://pytorch.org/tutorials/">https://pytorch.org/tutorials/</a> (the "Learn the Basics" series is enough).</p>
<p>Slides for Lecture 9 are on the Files page.</p>`,
  }),
  notice(7, digitalSystem, {
    title: roomChangeDay + '课程地点调整',
    publisher: '唐景行',
    hasRead: true,
    markedImportant: false,
    publishTime: dateTime(-5, 21, 46),
    content:
      '<p>各位同学：</p><p>为方便同学们做实验，' +
      roomChangeDay +
      '课程地点改为<span style="color:#c0392b"><span style="font-size:16px">中央主楼 916 机房</span></span>，时间还是原上课时间（13:30 开始），请各位同学相互转告~</p><p>祝 好！</p>',
  }),
  notice(8, electronicSystem, {
    title: '关于本学期实验课开放时间调整及实验室预约的说明',
    publisher: electronicSystem.teacherName,
    hasRead: true,
    markedImportant: false,
    publishTime: dateTime(-6, 11, 20),
    content: `<p>从第 10 周起，东主楼 10 区实验室开放时间调整为：</p>
<ul>
  <li>周一至周五 8:00–22:00</li>
  <li>周六 9:00–17:00（需提前一天预约）</li>
</ul>
<p>实验报告请使用附件中的模板，按“目的、原理、电路、数据、分析”的顺序撰写。查阅器件手册和论文可通过<a href="https://lib.tsinghua.edu.cn/">图书馆电子资源</a>。</p>`,
    attachment: attachment(
      '2001990202_ZY_1730972541880a7d93e4f-51c2-4b8e-a0f6-c3d2e1f0a9b8',
      '实验报告模板.docx',
      'labDocx',
    ),
  }),
  notice(9, communication, {
    title: '作业相关说明',
    publisher: '陆星辰',
    hasRead: false,
    markedImportant: false,
    publishTime: dateTime(-8, 9, 49),
    content:
      '<p>统一作业为四个班都要求的作业，<strong>全部计入课程成绩</strong>；除了统一作业之外，其它是本班专属作业，建议尽量按时完成，期末根据整体完成情况，<strong>酌情加分</strong>。</p>',
  }),
  notice(10, probability, {
    title: '第 6 次作业提示',
    publisher: '程一帆',
    hasRead: true,
    markedImportant: false,
    publishTime: dateTime(-9, 18, 3),
    content: `<p>第 2 题中泊松过程的分布律为</p>
<p>$$P\\{N(t)=k\\}=\\frac{(\\lambda t)^k}{k!}e^{-\\lambda t},\\quad k=0,1,2,\\ldots$$</p>
<p>第 3 题可以先求出两步转移矩阵 \\(P^{(2)} = P^2\\)，再解 \\(\\pi P = \\pi\\) 得到平稳分布。</p>`,
  }),
  notice(11, dsp, {
    title: '实验 3 测量数据记录表',
    publisher: dsp.teacherName,
    hasRead: true,
    markedImportant: false,
    publishTime: dateTime(-10, 15, 40),
    content:
      '<p>实验 3（FIR 滤波器设计与实现）请用附件表格记录各频点的输入、输出幅度，表格会自动计算增益，报告中请附上幅频特性曲线。</p>',
    attachment: attachment(
      '1996990293_ZY_1730620944512b3e8c7d2-9f41-4a6b-8e5d-7c1b2a3f4e5d',
      '实验3 测量数据记录表.xlsx',
      'dataXlsx',
    ),
  }),
  notice(12, swimming, {
    title: '游泳课期中测试安排',
    publisher: swimming.teacherName,
    hasRead: false,
    markedImportant: false,
    publishTime: dateTime(-11, 8, 15),
    content:
      '<p>第 11 周周六上课时进行期中测试：200 米自由泳计时，以及蛙泳技术评定。请自备泳帽和泳镜，提前 10 分钟到陈明游泳馆签到。</p>',
  }),
  notice(13, communication, {
    title: '课程讨论区里，发了一条关于第 1 讲作业的提示',
    publisher: communication.teacherName,
    hasRead: true,
    markedImportant: false,
    publishTime: dateTime(-12, 22, 30),
    content: '<p>可跟贴讨论。</p>',
  }),
  notice(14, communication, {
    title: '信源的信息度量课件第 19 页更正',
    publisher: communication.teacherName,
    hasRead: true,
    markedImportant: false,
    publishTime: dateTime(-13, 17, 50),
    content:
      '<p><span style="font-size:xx-large"><span style="color:black">原：固定事件个数</span><span style="color:black"><em>M</em></span><span style="color:black">的离散信源，均匀分布熵最大，为 1/<em>M</em></span></span></p><p><span style="font-size:24pt"><span style="color:black">更正为：固定事件个数<em>M</em>的离散信源，均匀分布熵最大，为 log<em>M</em></span></span></p>',
  }),
  notice(15, engineeringGraphics, {
    title: 'AutoCAD 上机安排',
    publisher: engineeringGraphics.teacherName,
    hasRead: true,
    markedImportant: false,
    publishTime: dateTime(-15, 10, 0),
    content:
      '<p>' +
      lastMonday +
      '上课时间在李兆基科技大楼 A302 集中上机，请提前在自己的电脑上安装好 AutoCAD 教育版，或使用机房电脑。</p>',
  }),
  introNotice(
    16,
    quantum,
    '成绩构成：平时作业 20%，期中考试 30%，期末考试 50%。教材为《量子力学》（第二版）和《热力学与统计物理》。',
  ),
  introNotice(
    17,
    communication,
    '成绩构成：作业 25%，大作业 25%，期末考试 50%。课件会在每次课前上传到课程文件。',
  ),
  introNotice(
    18,
    probability,
    '成绩构成：作业 20%，期中考试 30%，期末考试 50%。迟交作业按每天 10% 扣分，超过一周不再接收。',
  ),
  introNotice(
    19,
    digitalSystem,
    '本课程共 6 次实验，使用 Verilog 和 FPGA 开发板完成。开发板在第一次实验课时领取，期末归还。',
  ),
  introNotice(
    20,
    machineLearning,
    '成绩构成：作业 40%，课程项目 40%，课堂参与 20%。作业使用 Python 完成，可以用中文或英文写报告。',
  ),
  introNotice(
    21,
    audioVisual,
    '成绩构成：两次大作业各 30%，期末开卷考试 40%。',
  ),
  notice(22, signals, {
    title: '期末考试成绩已发布',
    publisher: signals.teacherName,
    hasRead: true,
    markedImportant: false,
    publishTime: dateTime(-120, 16, 0),
    content:
      '<p>期末考试成绩已经录入，可在选课系统查询。对成绩有疑问的同学请在一周内联系助教查卷。</p>',
  }),
  notice(23, circuits, {
    title: '期末答疑安排',
    publisher: circuits.teacherName,
    hasRead: true,
    markedImportant: false,
    publishTime: dateTime(-140, 9, 0),
    content: '<p>考前答疑安排在考试周的周一和周三晚上 7 点，三教 3100。</p>',
  }),
];

// --- Assignments ------------------------------------------------------------

const assignmentId = (n: number) =>
  `26ef84e76db3f55b016d${n.toString(16).padStart(12, '0')}`;

const emptySubmission =
  '<!-- <span style="line-height: 24px;"> -->\r\n\t\t\t\t\t\t\t\t\t\t<span style="line-height:2;">\r\n\t\t\t\t\t\t\t\t\t\t</span>';
/** Submitted text, wrapped the way the server returns it. */
const submittedText = (text: string) =>
  `<!-- <span style="line-height: 24px;"> -->\r\n\t\t\t\t\t\t\t\t\t\t<span style="line-height:2;">${text}</span>`;

type AssignmentFields = Omit<
  Assignment,
  | 'id'
  | 'url'
  | 'studentHomeworkId'
  | 'completionType'
  | 'submissionType'
  | 'isLateSubmission'
  | 'submittedContent'
  | keyof ReturnType<typeof of>
> &
  Partial<
    Pick<
      Assignment,
      | 'completionType'
      | 'submissionType'
      | 'isLateSubmission'
      | 'submittedContent'
    >
  >;

const assignment = (
  n: number,
  c: Course,
  fields: AssignmentFields,
): Assignment => ({
  id: assignmentId(n),
  url: assignmentUrl(assignmentId(n)),
  studentHomeworkId: `${n}`,
  completionType: HomeworkCompletionType.INDIVIDUAL,
  submissionType: HomeworkSubmissionType.WEB_LEARNING,
  isLateSubmission: false,
  submittedContent: emptySubmission,
  ...fields,
  ...of(c),
});

const excellentHomework = (
  base: number,
  index: number,
  title: string,
  author: { name: string; anonymous: boolean },
): NonNullable<Assignment['excellentHomeworkList']>[number] => {
  const id = `7f27d54daad54846a43796f5ed008e${index.toString().padStart(2, '0')}`;
  const file = attachment(
    `12389901${index}_ZY_1730316692859411626215e-c233-4663-a567-a932bf4d4962`,
    `${title}-${author.anonymous ? '优秀作业' : author.name}.pdf`,
    'solutionPdf',
  );
  return {
    id,
    baseId: assignmentId(base),
    title,
    url: assignmentUrl(id),
    completionType: HomeworkCompletionType.INDIVIDUAL,
    author: { id: `20230110${index}${index}`, ...author },
    submittedContent: submittedText('解答见附件。'),
    submittedAttachment: file,
  };
};

export const mockAssignments: Assignment[] = [
  assignment(1, communication, {
    title: '大作业1：OFDM 系统仿真',
    // Due tomorrow, so Today lists it under Due Soon.
    deadline: iso(1, 23, 59),
    completionType: HomeworkCompletionType.GROUP,
    submitted: false,
    graded: false,
    description:
      '<p>用 MATLAB 或 Python 搭建一个 OFDM 收发系统，在 AWGN 和多径信道下仿真误码率曲线，并与理论值比较。</p><p>提交报告（PDF）和代码，仿真参数见附件。</p>',
    attachment: attachment(
      '1298990181_ZY_1731316692859411626215e-c233-4663-a567-a932bf4d4962',
      '附件1：仿真参数说明.pdf',
      'handoutPdf',
    ),
  }),
  assignment(2, probability, {
    title: '第 6 次作业',
    // Due tonight: due soon, with hours left.
    deadline: iso(0, 23, 59),
    submitted: false,
    graded: false,
    description:
      '<p>教材习题 4.3、4.7、5.2。</p><p>提示：泊松过程满足 $$P\\{N(t)=k\\}=\\frac{(\\lambda t)^k}{k!}e^{-\\lambda t}.$$</p>',
  }),
  assignment(3, quantum, {
    title: '第 4 讲课后习题（纸质）',
    deadline: iso(3, 8, 0),
    submissionType: HomeworkSubmissionType.OFFLINE,
    submitted: false,
    graded: false,
    description: '<p>习题 2.5、2.9、2.14。手写，下次课前交到讲台上。</p>',
  }),
  assignment(4, digitalSystem, {
    title: '实验 4：有限状态机设计',
    deadline: iso(4, 23, 59),
    submitted: false,
    graded: false,
    description: `<p>设计一个自动售货机控制器，支持 1 元和 5 元硬币，商品 3 元，能找零。引脚分配如下：</p>
<table border="1" cellpadding="4" cellspacing="0" style="width:680px">
  <thead><tr><th>信号</th><th>方向</th><th>FPGA 引脚</th><th>说明</th></tr></thead>
  <tbody>
    <tr><td>clk</td><td>输入</td><td>P17</td><td>100 MHz 系统时钟</td></tr>
    <tr><td>rst_n</td><td>输入</td><td>R15</td><td>低电平复位（按键 S6）</td></tr>
    <tr><td>coin1 / coin5</td><td>输入</td><td>U4 / V1</td><td>投币按键，需要消抖</td></tr>
    <tr><td>dispense</td><td>输出</td><td>F6</td><td>出货指示灯</td></tr>
    <tr><td>change[2:0]</td><td>输出</td><td>G4 / G3 / J4</td><td>找零金额</td></tr>
  </tbody>
</table>
<p>提交 Verilog 源码、仿真波形截图和实验报告。</p>`,
    attachment: attachment(
      '1234990181_ZY_1731312692859211626215e-c233-4663-a567-a932bf4d4962',
      '实验报告模板.docx',
      'labDocx',
    ),
  }),
  assignment(5, machineLearning, {
    title: 'Homework 3: Support Vector Machines',
    deadline: iso(5, 23, 59),
    submitted: false,
    graded: false,
    description:
      '<p>Implement a soft-margin SVM with an RBF kernel and compare it with logistic regression on the provided dataset. Report accuracy for C ∈ {0.1, 1, 10} and discuss the effect of γ.</p><p>Submit a PDF report and a zip of your code. You may write the report in English or Chinese.</p>',
  }),
  assignment(6, communication, {
    // Submitted with an attachment and still open, so the submission screen
    // can replace or remove the uploaded attachment.
    title: '第二次书面作业',
    deadline: iso(7, 23, 59),
    submitTime: iso(-1, 21, 32),
    submitted: true,
    graded: false,
    description: '<p>完成课件第三章习题 1、3、5，提交电子版。</p>',
    submittedContent: submittedText('第 3 题的推导见附件。'),
    submittedAttachment: attachment(
      '1234990182_ZY_1731316692859411626215e-c233-4663-a567-a932bf4d4962',
      '第二次书面作业.pdf',
      'solutionPdf',
    ),
  }),
  assignment(7, audioVisual, {
    title: '第一次大作业',
    deadline: iso(12, 23, 59),
    completionType: HomeworkCompletionType.GROUP,
    submitted: false,
    graded: false,
    description:
      '<p>第一次大作业——利用灭点灭线估计建筑物高度。本次作业需要同学们分组完成，请仔细阅读说明文档并注意作业的截止时间。</p>',
    attachment: attachment(
      '1234990181_ZY_1731316692859211626215e-c233-4663-a567-a932bf4d4962',
      '第一次大作业说明.pdf',
      'handoutPdf',
    ),
  }),
  assignment(8, audioVisual, {
    // Past due, but late submission is still open.
    title: '第一次书面作业',
    deadline: iso(-2, 23, 59),
    lateSubmissionDeadline: iso(3, 23, 59),
    submitted: false,
    graded: false,
    description:
      '<p>请在网络学堂提交电子版。如果手写请保证扫描或拍照足够清晰。</p>',
    attachment: attachment(
      '1234990181_ZY_1731313692859211626215e-c233-4663-a567-a932bf4d4962',
      '作业一.pdf',
      'handoutPdf',
    ),
  }),
  assignment(9, electronicSystem, {
    // Past due and closed: missed.
    title: '实验 2 预习报告',
    deadline: iso(-5, 12, 0),
    submitted: false,
    graded: false,
    description: '<p>阅读实验 2 讲义，完成预习思考题，实验课前提交。</p>',
  }),
  assignment(10, dsp, {
    // Handed in after the deadline.
    title: '实验 3 报告：FIR 滤波器设计',
    deadline: iso(-3, 23, 59),
    lateSubmissionDeadline: iso(4, 23, 59),
    submitTime: iso(-1, 10, 18),
    isLateSubmission: true,
    submitted: true,
    graded: false,
    description:
      '<p>用窗函数法设计截止频率 1 kHz 的低通 FIR 滤波器，在 DSP 开发板上实现并测量幅频特性。</p>',
    submittedContent: submittedText('数据记录表和报告都在附件里。'),
    submittedAttachment: attachment(
      '1234990183_ZY_1731316692859411626215e-c233-4663-a567-a932bf4d4962',
      '实验3 测量数据.xlsx',
      'dataXlsx',
    ),
  }),
  assignment(11, probability, {
    // Graded with a score, feedback, the answer and excellent homework.
    title: '第 5 次作业',
    deadline: iso(-7, 23, 59),
    submitTime: iso(-8, 22, 41),
    submitted: true,
    graded: true,
    grade: 92,
    graderName: '程一帆',
    gradeTime: iso(-3, 15, 20),
    gradeContent:
      '<p>整体完成得很好。第 2 题求自相关函数时漏掉了 \\(\\cos\\) 的相位项，扣 8 分。</p>',
    description: '<p>教材习题 3.4、3.8、3.12、3.15。</p>',
    submittedContent: submittedText('解答见附件 PDF。'),
    submittedAttachment: attachment(
      '1238990181_ZY_1731316692859411626215e-c233-4663-a567-a932bf4d4962',
      '第5次作业.pdf',
      'solutionPdf',
    ),
    gradeAttachment: attachment(
      '123899018d_ZY_1731316692859411626215e-c233-4663-a567-a932bf4d4962',
      '第5次作业-批改.pdf',
      'solutionPdf',
    ),
    answerContent: '<p>参考答案已上传，请对照附件订正。</p>',
    answerAttachment: attachment(
      '123899018e_ZY_1731316692859411626215e-c233-4663-a567-a932bf4d4962',
      '第5次作业参考答案.pdf',
      'solutionPdf',
    ),
    excellentHomeworkList: [
      excellentHomework(11, 1, '第 5 次作业', {
        name: '周雨桐',
        anonymous: false,
      }),
      excellentHomework(11, 2, '第 5 次作业', { name: '', anonymous: true }),
      excellentHomework(11, 3, '第 5 次作业', {
        name: '邱子墨',
        anonymous: false,
      }),
    ],
  }),
  assignment(12, machineLearning, {
    // Graded with a level instead of a score.
    title: 'Homework 2: Linear Models',
    deadline: iso(-12, 23, 59),
    submitTime: iso(-13, 19, 5),
    submitted: true,
    graded: true,
    gradeLevel: HomeworkGradeLevel.A_MINUS,
    graderName: '陆星辰',
    gradeTime: iso(-6, 11, 0),
    gradeContent:
      '<p>Clear derivations. The learning-rate sweep in Q3 could use a log scale.</p>',
    description:
      '<p>Derive the closed-form solution of ridge regression and implement gradient descent for logistic regression.</p>',
    submittedContent: submittedText('Report and notebook attached.'),
    submittedAttachment: attachment(
      '1238990184_ZY_1731316692859411626215e-c233-4663-a567-a932bf4d4962',
      'hw2-report.pdf',
      'solutionPdf',
    ),
  }),
  assignment(13, engineeringGraphics, {
    // Graded as checked (已阅).
    title: 'AutoCAD绘图基础练习',
    deadline: iso(-3, 23, 59),
    submitTime: iso(-7, 20, 14),
    submitted: true,
    graded: true,
    gradeLevel: HomeworkGradeLevel.CHECKED,
    graderName: engineeringGraphics.teacherName,
    gradeTime: iso(-2, 9, 12),
    description:
      '<p>' +
      lastMonday +
      '上课的时间，在李兆基科技大楼 A302 集中上机，内容和要求如下：</p><p>1. 请参考上机指导书，完成并提交练习 3。请在截止时间之前提交到网络学堂。</p><p>2. 需标注尺寸，并请按照原图中尺寸的方式标注。</p><p>3. 文件名可以自取，但请注意提交文件的后缀为 .dwg</p><p>注：如果同学们有时间，可以在完成练习 3 之后，尝试练习 1 和 2（不用提交），以熟悉绘图模版是如何设置的。</p>',
    submittedAttachment: attachment(
      '1234990185_ZY_1731316692859411626215e-c233-4663-a567-a932bf4d4962',
      '练习3.pdf',
      'handoutPdf',
    ),
  }),
  assignment(14, quantum, {
    // Graded with a score only, and handed in on paper.
    title: '第 3 讲课后习题（纸质）',
    deadline: iso(-10, 8, 0),
    submissionType: HomeworkSubmissionType.OFFLINE,
    submitted: true,
    graded: true,
    grade: 85,
    gradeTime: iso(-4, 17, 30),
    description: '<p>习题 1.8、1.11、1.13。</p>',
  }),
  assignment(15, communication, {
    // Old, graded and archived.
    title: '第一次书面作业',
    deadline: iso(-30, 23, 59),
    submitTime: iso(-31, 16, 2),
    submitted: true,
    graded: true,
    grade: 100,
    graderName: '陆星辰',
    gradeTime: iso(-24, 10, 0),
    description: '<p>完成课件第一章习题 2、4。</p>',
  }),
  assignment(16, signals, {
    title: '期末大作业：语音信号的滤波与增强',
    deadline: dayjs().subtract(130, 'day').toISOString(),
    submitTime: dayjs().subtract(131, 'day').toISOString(),
    completionType: HomeworkCompletionType.GROUP,
    submitted: true,
    graded: true,
    gradeLevel: HomeworkGradeLevel.A,
    description: '<p>对给定的含噪语音信号设计滤波器进行增强，并分析频谱。</p>',
  }),
  assignment(17, dataStructures, {
    title: '第 3 次上机：平衡二叉树',
    deadline: dayjs().subtract(150, 'day').toISOString(),
    submitTime: dayjs().subtract(151, 'day').toISOString(),
    submitted: true,
    graded: true,
    grade: 96,
    description: '<p>实现 AVL 树的插入、删除和查找，并通过 OJ 测试。</p>',
  }),
];

// --- Files --------------------------------------------------------------------

const fileId = (n: number) =>
  `20163105${n.toString().padStart(2, '0')}_KJ_1731${n.toString().padStart(4, '0')}0b5f1dcc2-f77a-4cca-be0f-95808af85d82`;

const fileTypes: Record<Sample, string> = {
  lecturePdf: 'pdf',
  handoutPdf: 'pdf',
  solutionPdf: 'pdf',
  labDocx: 'docx',
  dataXlsx: 'xlsx',
  slidesPptx: 'pptx',
  audioZip: 'zip',
  timingPng: 'png',
  scopeMp4: 'mp4',
};

const file = (
  n: number,
  c: Course,
  sample: Sample,
  fields: Pick<File, 'title' | 'uploadTime'> &
    Partial<Pick<File, 'description' | 'isNew' | 'markedImportant' | 'size'>>,
  category?: string,
): File => ({
  id: fileId(n),
  description: '',
  isNew: false,
  markedImportant: false,
  size: samples[sample].size.replace(/\.\d+KB$/, 'K'),
  downloadUrl: sampleUrl(sample),
  fileType: fileTypes[sample],
  ...(category && {
    category: {
      id: `${c.id}-${category}`,
      title: category,
      creationTime: mockSemesterStart.toDate(),
    },
  }),
  ...fields,
  ...of(c),
});

export const mockFiles: File[] = [
  file(
    1,
    machineLearning,
    'slidesPptx',
    {
      title: '第 9 讲 深度学习框架',
      uploadTime: hoursAgo(20),
      isNew: true,
      markedImportant: true,
      size: '8.6M',
      description: '课上演示的代码在最后两页。',
    },
    '课件',
  ),
  file(
    2,
    audioVisual,
    'lecturePdf',
    {
      title: '人类视觉系统',
      uploadTime: dateTime(-1, 16, 18),
      isNew: true,
      size: '4.2M',
    },
    '课件',
  ),
  file(
    3,
    digitalSystem,
    'timingPng',
    {
      title: '实验 4 参考时序图',
      uploadTime: dateTime(-3, 20, 15),
      isNew: true,
    },
    '实验',
  ),
  file(
    4,
    dsp,
    'audioZip',
    {
      title: '第四次实验用音频信号',
      description: 'DTMF 双音多频信号，8 kHz 采样，每个按键一个 wav 文件。',
      uploadTime: dateTime(-4, 20, 18),
    },
    '实验',
  ),
  file(
    5,
    dsp,
    'dataXlsx',
    {
      title: '实验 3 测量数据记录表',
      uploadTime: dateTime(-10, 15, 42),
    },
    '实验',
  ),
  file(6, electronicSystem, 'scopeMp4', {
    title: '示波器使用演示',
    description: '如何观察两个频率接近的信号叠加后的拍频现象。',
    uploadTime: dateTime(-5, 9, 0),
    size: '38.5M',
  }),
  file(7, electronicSystem, 'labDocx', {
    title: '实验报告模板',
    uploadTime: dateTime(-6, 11, 22),
    markedImportant: true,
  }),
  file(
    8,
    probability,
    'solutionPdf',
    {
      title: '第 5 次作业参考答案',
      uploadTime: dateTime(-3, 15, 30),
      isNew: true,
    },
    '作业答案',
  ),
  file(
    9,
    probability,
    'lecturePdf',
    {
      title: '第六讲 泊松过程',
      uploadTime: dateTime(-7, 12, 47),
      size: '2.3M',
    },
    '课件',
  ),
  file(
    10,
    quantum,
    'lecturePdf',
    {
      title: '量子7（测量几率、不确定关系）',
      description: '24-26 页有关于不确定度的补充解释（紫色字体）',
      uploadTime: dateTime(-5, 16, 16),
      size: '2.0M',
    },
    '课件',
  ),
  file(
    11,
    communication,
    'lecturePdf',
    {
      title: '第 5 讲 信源的信息度量（更正版）',
      uploadTime: dateTime(-13, 18, 2),
      size: '3.1M',
    },
    '课件',
  ),
  file(
    12,
    communication,
    'handoutPdf',
    {
      title: '大作业 1 仿真参数说明',
      uploadTime: dateTime(-14, 21, 31),
    },
    '作业',
  ),
  file(
    13,
    audioVisual,
    'handoutPdf',
    {
      title: '第一次大作业说明',
      uploadTime: dateTime(-2, 16, 20),
    },
    '作业',
  ),
  file(
    14,
    machineLearning,
    'slidesPptx',
    {
      title: '第 8 讲 支持向量机',
      uploadTime: dateTime(-7, 9, 50),
      size: '6.9M',
    },
    '课件',
  ),
  file(15, engineeringGraphics, 'handoutPdf', {
    title: 'AutoCAD 上机指导书',
    uploadTime: dateTime(-16, 14, 0),
    size: '12.7M',
  }),
  file(16, digitalSystem, 'lecturePdf', {
    title: 'Verilog 语法速查',
    uploadTime: dateTime(-50, 10, 30),
    size: '1.1M',
  }),
  file(17, signals, 'lecturePdf', {
    title: '期末复习提纲',
    uploadTime: dateTime(-135, 10, 0),
  }),
  file(18, circuits, 'solutionPdf', {
    title: '历年期末试题',
    uploadTime: dateTime(-145, 10, 0),
  }),
];

// --- The user's own data ------------------------------------------------------

export const mockUserData: UserData = {
  favorites: {
    notice: [noticeId(2), noticeId(4), noticeId(14)],
    assignment: [assignmentId(7), assignmentId(11)],
    file: [fileId(2), fileId(4), fileId(7)],
  },
  archived: {
    notice: [noticeId(14)],
    assignment: [assignmentId(15)],
    file: [fileId(16)],
  },
  hiddenCourses: [research.id],
  courseOrder: [],
  // Fetched from the emulated server, like a real account.
  currentSemester: null,
  latestSemester: null,
};
