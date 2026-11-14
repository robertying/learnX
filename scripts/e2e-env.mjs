// Prints the Maestro env values (`KEY=value` lines) that the flows in
// .maestro/ match text with, read from the app's own sources so the flows
// follow every translation or mock data edit:
//
// - `T_<key>`: the translation `<key>` in English and Chinese, as a regex
//   alternation (`T_search` = `Search|搜索`). Only keys the flows use are
//   printed.
// - `MOCK_*`: mock items (`data/mock.ts`, `data/mockEnglish.ts`) the flows
//   open, as an alternation of their English and Chinese texts. A flow matches
//   one inside a card's label as `'.*(${MOCK_NOTICE}).*'`.
// - `STORE_SEARCH_TERM`: what the store screenshots (.maestro/store/), which
//   are in Chinese, search for.
//
// scripts/e2e.sh passes each line to Maestro with -e. Node strips the types.
import { readdirSync, readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'src');
const srcDirs = new Set(readdirSync(src));

// The app's imports name TypeScript files without the extension, and from
// src/ without a path (`data/mock`).
registerHooks({
  resolve(specifier, context, nextResolve) {
    const fromSrc = srcDirs.has(specifier.split('/')[0]);
    const path = fromSrc ? pathToFileURL(join(src, specifier)).href : specifier;
    if (fromSrc || (specifier.startsWith('.') && !/\.\w+$/.test(specifier))) {
      return nextResolve(`${path}.ts`, context);
    }
    // The mock data only needs the library's enums; its entry also loads
    // cheerio, whose ESM build doesn't load in plain Node.
    if (specifier === '@robertying/thu-learn-lib') {
      return nextResolve(
        pathToFileURL(join(root, `node_modules/${specifier}/lib/types.js`))
          .href,
        context,
      );
    }
    return nextResolve(specifier, context);
  },
});

const { default: en } = await import('../src/assets/translations/en.ts');
const { default: zh } = await import('../src/assets/translations/zh.ts');
const zhMock = await import('../src/data/mock.ts');
const { mockInEnglish } = await import('../src/data/mockEnglish.ts');
const enMock = mockInEnglish();

const escape = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const either = (english, chinese) => `${escape(english)}|${escape(chinese)}`;

const item = (list, id) => {
  const found = list.find(i => i.id === id);
  if (!found) {
    throw new Error(`No mock item ${id}`);
  }
  return found;
};
const both = (listName, id, field = i => i.title) =>
  either(field(item(enMock[listName], id)), field(item(zhMock[listName], id)));

// Notice 1 (read, Quantum and Statistical Physics), which flows open, favorite
// and archive.
const notice = item(zhMock.mockNotices, zhMock.noticeId(1));
const course = item(zhMock.mockCourses, notice.courseId);
// Assignment 1 (due tomorrow, with an attachment) and file 2, the newest file
// with a Chinese title (file 1 belongs to the English-taught course).
const assignment = zhMock.assignmentId(1);
const file = zhMock.fileId(2);
// Search: SEARCH_TERM is ASCII (Maestro can't type CJK on Android) and finds
// notice 15 and assignment 13 in both languages.
const searchTerm = 'AutoCAD';
const searchNotice = zhMock.noticeId(15);
const searchAssignment = zhMock.assignmentId(13);

// The store screenshots (.maestro/store/): notice 3 and assignment 7 (both
// "Project 1", with an attachment and a future deadline), file 2 (a PDF) and
// notice 3's course, which split views open while notice 1's course shows
// its swipe actions.
const storeNotice = item(zhMock.mockNotices, zhMock.noticeId(3));
const storeCourse = item(zhMock.mockCourses, storeNotice.courseId);
const storeAssignment = zhMock.assignmentId(7);
const storeFile = zhMock.fileId(2);
const courseName = c =>
  either(c.englishName || c.name, c.chineseName || c.name);

const mock = {
  MOCK_NOTICE: both('mockNotices', notice.id),
  // As data/courseNames shows a course in each language.
  MOCK_COURSE: courseName(course),
  MOCK_ASSIGNMENT: both('mockAssignments', assignment),
  MOCK_ASSIGNMENT_ATTACHMENT: both(
    'mockAssignments',
    assignment,
    a => a.attachment.name,
  ),
  MOCK_FILE: both('mockFiles', file),
  MOCK_SEARCH_TERM: searchTerm,
  MOCK_SEARCH_NOTICE: both('mockNotices', searchNotice),
  MOCK_SEARCH_ASSIGNMENT: both('mockAssignments', searchAssignment),
  MOCK_STORE_NOTICE: both('mockNotices', storeNotice.id),
  // The start of its body, to wait for its web view to render.
  MOCK_STORE_NOTICE_BODY: both('mockNotices', storeNotice.id, n => {
    const text = n.content.replace(/<[^>]+>/g, ' ').trim();
    return /\p{Script=Han}/u.test(text)
      ? text.slice(0, 8)
      : text.split(/\s+/).slice(0, 3).join(' ');
  }),
  MOCK_STORE_COURSE: courseName(storeCourse),
  MOCK_STORE_ASSIGNMENT: both('mockAssignments', storeAssignment),
  MOCK_STORE_FILE: both('mockFiles', storeFile),
};
for (const [listName, id] of [
  ['mockNotices', searchNotice],
  ['mockAssignments', searchAssignment],
]) {
  for (const list of [enMock[listName], zhMock[listName]]) {
    if (!item(list, id).title.includes(searchTerm)) {
      throw new Error(`Mock item ${id} doesn't contain "${searchTerm}"`);
    }
  }
}

// The store screenshots are in Chinese and search for 作业 ("Assignments");
// the results include assignment 7.
const storeSearchTerm = zh.assignments;
if (
  !item(zhMock.mockAssignments, storeAssignment).title.includes(storeSearchTerm)
) {
  throw new Error(
    `Mock item ${storeAssignment} doesn't contain "${storeSearchTerm}"`,
  );
}

// The translation keys the flows use, in every folder of .maestro/.
const maestro = join(root, '.maestro');
const flows = readdirSync(maestro, { recursive: true })
  .map(name => join(maestro, name))
  .filter(path => path.endsWith('.yaml'));
const keys = new Set(
  flows.flatMap(path =>
    [...readFileSync(path, 'utf8').matchAll(/\$\{T_(\w+)\}/g)].map(m => m[1]),
  ),
);

const lines = Object.entries(mock).map(([key, value]) => `${key}=${value}`);
lines.push(`STORE_SEARCH_TERM=${storeSearchTerm}`);
for (const key of [...keys].sort()) {
  if (typeof en[key] !== 'string' || typeof zh[key] !== 'string') {
    throw new Error(`No translation "${key}" (used as \${T_${key}})`);
  }
  lines.push(`T_${key}=${either(en[key], zh[key])}`);
}
console.log(lines.join('\n'));
