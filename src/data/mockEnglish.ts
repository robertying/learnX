import type { Assignment, Course, File, Notice, User } from 'data/types/state';
import * as base from 'data/mock';
import {
  assignmentId,
  sampleUrl,
  submittedText,
  fileId,
  mockAssignments,
  mockCourses,
  mockDays,
  mockFiles,
  mockNotices,
  mockUser,
  noticeId,
} from 'data/mock';

/*
 * The mock account in English, for when the app asks the emulated server for
 * English. Each text replaces its Chinese counterpart in `data/mock.ts` by item
 * id, so both languages show the same items in the same states. Texts the mock
 * already has in English (a few notices and assignments of the machine
 * learning course) are not repeated here. The made-up people keep their
 * Chinese names in pinyin.
 */

const day = (d: typeof mockDays.sunday) => d.format('MMMM D');
const sunday = `${day(mockDays.sunday)} (Sunday)`;
const roomChangeDay = day(mockDays.roomChange);
const examDay = day(mockDays.exam);
const lastMonday = `${day(mockDays.lastMonday)} (Monday)`;

type Overlay = Record<string, string>;

const english: User = {
  name: 'Siyuan Chen',
  department: 'Department of Electronic Engineering',
};

const personNames: Record<string, string> = {
  陈思远: 'Siyuan Chen',
  林启航: 'Qihang Lin',
  宋闻溪: 'Wenxi Song',
  许嘉禾: 'Jiahe Xu',
  方书语: 'Shuyu Fang',
  秦立衡: 'Liheng Qin',
  顾承远: 'Chengyuan Gu',
  邵清和: 'Qinghe Shao',
  姜以宁: 'Yining Jiang',
  温雅琳: 'Yalin Wen',
  夏子川: 'Zichuan Xia',
  罗知微: 'Zhiwei Luo',
  韩若谷: 'Ruogu Han',
  黎慕白: 'Mubai Li',
  钟以恒: 'Yiheng Zhong',
  程一帆: 'Yifan Cheng',
  白若溪: 'Ruoxi Bai',
  唐景行: 'Jingxing Tang',
  陆星辰: 'Xingchen Lu',
  周雨桐: 'Yutong Zhou',
  邱子墨: 'Zimo Qiu',
};
const person = (name: string) => personNames[name] ?? name;

const categoryNames: Record<string, string> = {
  课件: 'Slides',
  实验: 'Labs',
  作业: 'Homework',
  作业答案: 'Homework Solutions',
};

/** Puts `overlay` over `item`; a text over an attachment renames it. */
const overlaid = <T extends object>(item: T, overlay: Overlay = {}): T => {
  const result = { ...item } as Record<string, unknown>;
  for (const [key, text] of Object.entries(overlay)) {
    const current = result[key];
    result[key] =
      current && typeof current === 'object'
        ? { ...current, name: text }
        : text;
  }
  return result as T;
};

const intro = (body: string) => ({
  title: 'Course Introduction and Grading',
  content: `<p>Hello everyone, and welcome to the course!</p><p>${body}</p><p>Office hours are every Thursday from 4:00 to 5:30 p.m.; the location is in the syllabus. You can also leave a message in the course discussion forum.</p>`,
});

const notices: Record<number, Overlay> = {
  1: {
    title:
      'Please hand in homework as arranged by the TA (no longer in the old homework box, to avoid loss or delay)',
    content:
      '<p>The TA has arranged how to hand in homework: put paper homework in the collection bag on the lectern before Thursday’s class, and submit the electronic version on Web Learning.</p><p>Please stop leaving homework in the box at the Science Building, to avoid loss or delayed grading.</p>',
  },
  2: {
    title: `Make-up class: ${sunday} at 8:00 (for Friday’s class)`,
    content: `<p>Following the school’s holiday schedule, Friday’s class is made up on ${sunday}. Quantum and Statistical Physics meets at <strong>8:00 a.m.</strong>, in the same room (Building 6, 6A118).</p>`,
  },
  3: {
    title: 'Project 1',
    content:
      '<p>Project 1 has been assigned: estimating a building’s height from vanishing points and vanishing lines. Please read the handout carefully, watch the deadline, and plan your time.</p><p>The project is done in groups of up to 3. Please send your group list to the TA before next Wednesday.</p>',
    attachment: 'Project 1 Handout.pdf',
  },
  4: {
    title: 'Midterm Exam Schedule',
    content: `<p>The midterm exam is arranged as follows. Please go to the room for your student ID, <strong>bring your student card</strong>, and arrive 15 minutes early.</p>
<table border="1" cellpadding="4" cellspacing="0" style="width:760px">
  <thead>
    <tr><th>Date</th><th>Time</th><th>Student IDs</th><th>Room</th><th>Coverage</th><th>Review session</th></tr>
  </thead>
  <tbody>
    <tr><td>${examDay}</td><td>19:20–21:20</td><td>Ending 0–4</td><td>Building 6, 6A015</td><td>Lectures 1–6 (stochastic processes, stationary processes, Poisson processes)</td><td>Wednesday evening before the exam, Building 4, 4101</td></tr>
    <tr><td>${examDay}</td><td>19:20–21:20</td><td>Ending 5–9</td><td>Building 6, 6A017</td><td>Lectures 1–6 (stochastic processes, stationary processes, Poisson processes)</td><td>Wednesday evening before the exam, Building 4, 4101</td></tr>
    <tr><td>To be announced</td><td>—</td><td>Deferred exam</td><td>—</td><td>Same</td><td>—</td></tr>
  </tbody>
</table>
<p>The exam is closed-book. You may bring one handwritten A4 formula sheet; calculators are not allowed.</p>`,
  },
  5: {
    title: 'Lab 4 Timing Diagram',
    content: `<p>Several of you asked about the counter timing in Lab 4. Below is a reference simulation waveform. After reset is released and enable goes high, the counter increments on every rising clock edge:</p>
<p><img alt="Timing diagram of a 4-bit synchronous counter" src="${sampleUrl('timingPng')}" style="width:800px; height:380px" /></p>
<p>Please include your own simulation waveform in the lab report and mark the setup and hold times.</p>`,
  },
  7: {
    title: `Room change on ${roomChangeDay}`,
    content: `<p>Hello everyone,</p><p>To make the lab easier, on ${roomChangeDay} the class moves to the <span style="color:#c0392b"><span style="font-size:16px">computer lab 916 in the Main Building</span></span>. The time is unchanged (13:30). Please pass this on~</p><p>Best wishes!</p>`,
  },
  8: {
    title: 'New lab opening hours and how to reserve the lab',
    content: `<p>From Week 10, the lab in Area 10 of the East Main Building is open:</p>
<ul>
  <li>Monday to Friday, 8:00–22:00</li>
  <li>Saturday, 9:00–17:00 (reserve one day ahead)</li>
</ul>
<p>Please write lab reports with the attached template, in the order Purpose, Principle, Circuit, Data, Analysis. Datasheets and papers are available through the <a href="https://lib.tsinghua.edu.cn/">library’s electronic resources</a>.</p>`,
    attachment: 'Lab Report Template.docx',
  },
  9: {
    title: 'About the homework',
    publisher: 'Xingchen Lu',
    content:
      '<p>The common homework is required in all four sections and <strong>counts fully toward the course grade</strong>. The other homework is specific to this section; please try to finish it on time, and the final grade may get <strong>bonus points</strong> based on overall completion.</p>',
  },
  10: {
    title: 'Hints for Homework 6',
    content: `<p>For problem 2, the distribution of the Poisson process is</p>
<p>$$P\\{N(t)=k\\}=\\frac{(\\lambda t)^k}{k!}e^{-\\lambda t},\\quad k=0,1,2,\\ldots$$</p>
<p>For problem 3, first find the two-step transition matrix \\(P^{(2)} = P^2\\), then solve \\(\\pi P = \\pi\\) for the stationary distribution.</p>`,
  },
  11: {
    title: 'Lab 3 Measurement Data Sheet',
    content:
      '<p>For Lab 3 (FIR filter design and implementation), please record the input and output amplitude at each frequency in the attached sheet. It computes the gain automatically; include the magnitude response curve in your report.</p>',
    attachment: 'Lab 3 Measurement Data Sheet.xlsx',
  },
  12: {
    title: 'Swimming Midterm Test',
    content:
      '<p>The midterm test is during Saturday’s class in Week 11: a timed 200 m freestyle and a breaststroke technique assessment. Bring your own swim cap and goggles, and check in at the Chen Ming Swimming Hall 10 minutes early.</p>',
  },
  13: {
    title: 'A hint for Lecture 1’s homework was posted in the course forum',
    content: '<p>Feel free to reply and discuss.</p>',
  },
  14: {
    title: 'Correction on Slide 19 of the Source Information Measures lecture',
    content:
      '<p><span style="font-size:xx-large"><span style="color:black">Original: for a discrete source with a fixed number of events</span><span style="color:black"><em> M</em></span><span style="color:black">, the entropy is maximal for the uniform distribution, equal to 1/<em>M</em></span></span></p><p><span style="font-size:24pt"><span style="color:black">Corrected: for a discrete source with a fixed number of events <em>M</em>, the entropy is maximal for the uniform distribution, equal to log<em>M</em></span></span></p>',
  },
  15: {
    title: 'AutoCAD Computer Session',
    content: `<p>On ${lastMonday} we meet at A302 in the Li Ka Shing Building for a hands-on session. Please install the AutoCAD education version on your own computer beforehand, or use the lab computers.</p>`,
  },
  16: intro(
    'Grading: homework 20%, midterm 30%, final 50%. The textbooks are <em>Quantum Mechanics</em> (2nd edition) and <em>Thermodynamics and Statistical Physics</em>.',
  ),
  17: intro(
    'Grading: homework 25%, project 25%, final 50%. Slides are uploaded to the course files before each class.',
  ),
  18: intro(
    'Grading: homework 20%, midterm 30%, final 50%. Late homework loses 10% per day and is not accepted after a week.',
  ),
  19: intro(
    'There are 6 labs in total, done in Verilog on an FPGA board. You collect the board in the first lab session and return it at the end of the term.',
  ),
  20: intro(
    'Grading: homework 40%, course project 40%, participation 20%. Homework is done in Python; reports can be written in Chinese or English.',
  ),
  21: intro(
    'Grading: two projects at 30% each, and an open-book final exam at 40%.',
  ),
  22: {
    title: 'Final Exam Grades Released',
    content:
      '<p>Final exam grades have been entered and can be checked in the course registration system. If you have questions about your grade, please contact the TA within a week to review your exam paper.</p>',
  },
  23: {
    title: 'Final Exam Review Sessions',
    content:
      '<p>Review sessions are on Monday and Wednesday evenings of exam week at 7 p.m., in Building 3, room 3100.</p>',
  },
};

const assignments: Record<number, Overlay> = {
  1: {
    title: 'Project 1: OFDM System Simulation',
    description:
      '<p>Build an OFDM transceiver in MATLAB or Python, simulate its bit error rate under AWGN and multipath channels, and compare with the theoretical values.</p><p>Submit a report (PDF) and your code. The simulation parameters are in the attachment.</p>',
    attachment: 'Attachment 1: Simulation Parameters.pdf',
  },
  2: {
    title: 'Homework 6',
    description:
      '<p>Textbook exercises 4.3, 4.7 and 5.2.</p><p>Hint: the Poisson process satisfies $$P\\{N(t)=k\\}=\\frac{(\\lambda t)^k}{k!}e^{-\\lambda t}.$$</p>',
  },
  3: {
    title: 'Lecture 4 Exercises (paper)',
    description:
      '<p>Exercises 2.5, 2.9 and 2.14. Handwritten; hand them in on the lectern before the next class.</p>',
  },
  4: {
    title: 'Lab 4: Finite State Machine Design',
    description: `<p>Design a vending machine controller that accepts 1-yuan and 5-yuan coins, sells an item for 3 yuan and gives change. The pin assignment is:</p>
<table border="1" cellpadding="4" cellspacing="0" style="width:680px">
  <thead><tr><th>Signal</th><th>Direction</th><th>FPGA pin</th><th>Description</th></tr></thead>
  <tbody>
    <tr><td>clk</td><td>Input</td><td>P17</td><td>100 MHz system clock</td></tr>
    <tr><td>rst_n</td><td>Input</td><td>R15</td><td>Active-low reset (button S6)</td></tr>
    <tr><td>coin1 / coin5</td><td>Input</td><td>U4 / V1</td><td>Coin buttons; need debouncing</td></tr>
    <tr><td>dispense</td><td>Output</td><td>F6</td><td>Dispense indicator LED</td></tr>
    <tr><td>change[2:0]</td><td>Output</td><td>G4 / G3 / J4</td><td>Change amount</td></tr>
  </tbody>
</table>
<p>Submit the Verilog source, simulation waveform screenshots and a lab report.</p>`,
    attachment: 'Lab Report Template.docx',
  },
  6: {
    title: 'Written Homework 2',
    description:
      '<p>Do exercises 1, 3 and 5 of Chapter 3 in the slides and submit the electronic version.</p>',
    submittedContent: submittedText(
      'The derivation for problem 3 is in the attachment.',
    ),
    submittedAttachment: 'Written Homework 2.pdf',
  },
  7: {
    title: 'Project 1',
    description:
      '<p>Project 1: estimating a building’s height from vanishing points and vanishing lines. It is done in groups; please read the handout carefully and watch the deadline.</p>',
    attachment: 'Project 1 Handout.pdf',
  },
  8: {
    title: 'Written Homework 1',
    description:
      '<p>Please submit the electronic version on Web Learning. If handwritten, make sure the scan or photo is clear enough.</p>',
    attachment: 'Homework 1.pdf',
  },
  9: {
    title: 'Lab 2 Pre-lab Report',
    description:
      '<p>Read the Lab 2 handout and answer the pre-lab questions. Submit before the lab session.</p>',
  },
  10: {
    title: 'Lab 3 Report: FIR Filter Design',
    description:
      '<p>Design a low-pass FIR filter with a 1 kHz cutoff using the window method, implement it on the DSP board and measure its magnitude response.</p>',
    submittedContent: submittedText(
      'The data sheet and the report are both attached.',
    ),
    submittedAttachment: 'Lab 3 Measurements.xlsx',
  },
  11: {
    title: 'Homework 5',
    gradeContent:
      '<p>Well done overall. In problem 2, the phase term of the cosine is missing from the autocorrelation function (−8 points).</p>',
    description: '<p>Textbook exercises 3.4, 3.8, 3.12 and 3.15.</p>',
    submittedContent: submittedText('Solutions are in the attached PDF.'),
    submittedAttachment: 'Homework 5.pdf',
    gradeAttachment: 'Homework 5 - Graded.pdf',
    answerContent:
      '<p>The reference solution is uploaded. Please compare it with the attachment and correct your work.</p>',
    answerAttachment: 'Homework 5 Solutions.pdf',
  },
  13: {
    title: 'AutoCAD Drawing Basics',
    description: `<p>In class on ${lastMonday} we meet at A302 in the Li Ka Shing Building for a hands-on session. Content and requirements:</p><p>1. Following the lab guide, complete and submit Exercise 3 on Web Learning before the deadline.</p><p>2. Add dimensions, in the same style as in the original drawing.</p><p>3. Name the file as you like, but it must end in .dwg</p><p>Note: if you have time after Exercise 3, try Exercises 1 and 2 as well (not to be submitted) to see how the drawing template is set up.</p>`,
    submittedAttachment: 'Exercise 3.pdf',
  },
  14: {
    title: 'Lecture 3 Exercises (paper)',
    description: '<p>Exercises 1.8, 1.11 and 1.13.</p>',
  },
  15: {
    title: 'Written Homework 1',
    description: '<p>Do exercises 2 and 4 of Chapter 1 in the slides.</p>',
  },
  16: {
    title: 'Final Project: Filtering and Enhancing a Speech Signal',
    description:
      '<p>Design filters to enhance the given noisy speech signal, and analyze its spectrum.</p>',
  },
  17: {
    title: 'Lab 3: Balanced Binary Trees',
    description:
      '<p>Implement insertion, deletion and search for AVL trees and pass the OJ tests.</p>',
  },
};

/** Titles and file names of the excellent homework of Homework 5. */
const excellentTitle = 'Homework 5';
const excellentLabel = 'Excellent Homework';

const files: Record<number, Overlay> = {
  1: {
    title: 'Lecture 9: Deep Learning Frameworks',
    description: 'The code shown in class is on the last two slides.',
  },
  2: { title: 'The Human Visual System' },
  3: { title: 'Lab 4 Reference Timing Diagram' },
  4: {
    title: 'Audio Signals for Lab 4',
    description:
      'DTMF dual-tone signals, sampled at 8 kHz, one wav file per key.',
  },
  5: { title: 'Lab 3 Measurement Data Sheet' },
  6: {
    title: 'Oscilloscope Demo',
    description:
      'How to observe the beat pattern of two signals with close frequencies.',
  },
  7: { title: 'Lab Report Template' },
  8: { title: 'Homework 5 Solutions' },
  9: { title: 'Lecture 6: Poisson Processes' },
  10: {
    title: 'Quantum 7: Measurement Probabilities and Uncertainty Relations',
    description:
      'Slides 24–26 have additional explanations on uncertainty (in purple).',
  },
  11: { title: 'Lecture 5: Source Information Measures (corrected)' },
  12: { title: 'Project 1 Simulation Parameters' },
  13: { title: 'Project 1 Handout' },
  14: { title: 'Lecture 8: Support Vector Machines' },
  15: { title: 'AutoCAD Lab Guide' },
  16: { title: 'Verilog Syntax Cheat Sheet' },
  17: { title: 'Final Exam Review Outline' },
  18: { title: 'Past Final Exams' },
};

const byId = (table: Record<number, Overlay>, idOf: (n: number) => string) =>
  new Map<string, Overlay>(
    Object.entries(table).map(([n, overlay]) => [idOf(Number(n)), overlay]),
  );

const noticeOverlays = byId(notices, noticeId);
const assignmentOverlays = byId(assignments, assignmentId);
const fileOverlays = byId(files, fileId);

export const englishNoticeTexts = noticeOverlays;
export const englishAssignmentTexts = assignmentOverlays;
export const englishFileTexts = fileOverlays;

const englishCourse = (course: Course): Course => ({
  ...course,
  teacherName: person(course.teacherName),
});

const englishNotice = (item: Notice): Notice => {
  const result = overlaid(item, noticeOverlays.get(item.id));
  return {
    ...result,
    publisher: person(result.publisher),
    courseTeacherName: person(result.courseTeacherName),
  };
};

const englishAssignment = (item: Assignment): Assignment => {
  const result = overlaid(item, assignmentOverlays.get(item.id));
  return {
    ...result,
    courseTeacherName: person(result.courseTeacherName),
    ...(result.graderName && { graderName: person(result.graderName) }),
    ...(result.excellentHomeworkList && {
      excellentHomeworkList: result.excellentHomeworkList.map(homework => ({
        ...homework,
        title: excellentTitle,
        author: { ...homework.author, name: person(homework.author.name) },
        submittedContent: submittedText(
          'See the attachment for the solutions.',
        ),
        submittedAttachment: homework.submittedAttachment && {
          ...homework.submittedAttachment,
          name: `${excellentTitle}-${
            homework.author.anonymous
              ? excellentLabel
              : person(homework.author.name)
          }.pdf`,
        },
      })),
    }),
  };
};

const englishFile = (item: File): File => {
  const result = overlaid(item, fileOverlays.get(item.id));
  return {
    ...result,
    courseTeacherName: person(result.courseTeacherName),
    ...(result.category && {
      category: {
        ...result.category,
        title: categoryNames[result.category.title] ?? result.category.title,
      },
    }),
  };
};

let cached: typeof import('data/mock') | undefined;

/** `data/mock` with its Chinese texts replaced by the English ones. */
export const mockInEnglish = (): typeof import('data/mock') =>
  (cached ??= {
    ...base,
    mockUser: { ...mockUser, ...english },
    mockCourses: mockCourses.map(englishCourse),
    mockNotices: mockNotices.map(englishNotice),
    mockAssignments: mockAssignments.map(englishAssignment),
    mockFiles: mockFiles.map(englishFile),
  });
