import {
  matchRanges,
  snippet,
  searchHits,
  hasHan,
  normalize,
  queryWords,
  SearchSpec,
  SearchTier,
  searchItems,
} from 'helpers/search';

interface Item {
  id: string;
  title: string;
  course: string;
  file?: string;
  teacher?: string;
  body?: string;
  urgent?: boolean;
}

const spec: SearchSpec<Item> = {
  fields: [
    { get: i => i.title, tier: SearchTier.Title, abbreviations: true },
    { get: i => i.course, tier: SearchTier.Course, abbreviations: true },
    { get: i => [i.file], tier: SearchTier.Name },
    { get: i => i.teacher, tier: SearchTier.Person },
    { get: i => i.body, tier: SearchTier.Body },
  ],
  attention: i => !!i.urgent,
};

const items: Item[] = [
  {
    id: 'net-hw',
    title: '第三次作业：TCP 拥塞控制',
    course: '计算机网络',
    body: '请于周五前提交实验报告',
  },
  { id: 'ds-hw', title: '作业 5', course: '数据结构', body: '链表与栈' },
  {
    id: 'marx',
    title: '期中论文要求',
    course: '马克思主义基本原理',
    teacher: '张老师',
  },
  {
    id: 'ds-notice',
    title: '期中考试安排',
    course: '数据结构',
    body: '考试范围包括作业 1 到作业 4',
  },
  {
    id: 'lab',
    title: 'Final lab report',
    course: 'Operating Systems',
    file: 'syllabus.pdf',
  },
];

const ids = (query: string, list = items) =>
  searchItems(list, query, spec, 0).map(i => i.id);

describe('normalize', () => {
  it('makes full-width text its usual form, lowercase, with single spaces', () => {
    expect(normalize('  ＴＣＰ　１２３，Lab  ')).toBe('tcp 123,lab');
  });
});

describe('queryWords', () => {
  it('splits at spaces and where Han text starts or ends', () => {
    expect(queryWords('tcp拥塞 控制Lab2')).toEqual([
      'tcp',
      '拥塞',
      '控制',
      'lab2',
    ]);
    expect(queryWords('   ')).toEqual([]);
  });
});

describe('hasHan', () => {
  it('tells Chinese queries from others', () => {
    expect(hasHan('作业')).toBe(true);
    expect(hasHan('deadline 2')).toBe(false);
  });
});

describe('searchItems', () => {
  it('matches nothing for an empty query', () => {
    expect(ids('')).toEqual([]);
  });

  it('needs every word to match, in any field', () => {
    expect(ids('作业 数据结构')).toEqual(['ds-hw', 'ds-notice']);
    expect(ids('tcp拥塞')).toEqual(['net-hw']);
    expect(ids('作业 物理')).toEqual([]);
  });

  it('matches full-width input', () => {
    expect(ids('ＴＣＰ')).toEqual(['net-hw']);
  });

  it("doesn't let one wrong character through in Chinese", () => {
    expect(ids('数据结钩')).toEqual([]);
  });

  it('matches a query typed without spaces across fields', () => {
    expect(ids('数据结构作业')).toEqual(['ds-hw', 'ds-notice']);
    expect(ids('网络作业')).toEqual(['net-hw']);
  });

  it('matches the last character as it is being typed', () => {
    expect(ids('数据结构作')).toEqual(['ds-hw', 'ds-notice']);
  });

  it('matches abbreviations of course names and titles', () => {
    expect(ids('计网')).toEqual(['net-hw']);
    expect(ids('马原')).toEqual(['marx']);
    expect(ids('计网作业')).toEqual(['net-hw']);
    // Not from the field's first character, and not in bodies
    expect(ids('算网')).toEqual([]);
    expect(ids('周报')).toEqual([]);
  });

  it('ranks titles over courses over names over people over bodies', () => {
    const list: Item[] = [
      { id: 'body', title: 'a', course: 'b', body: 'x 实验 y' },
      { id: 'person', title: 'a', course: 'b', teacher: '实验老师' },
      { id: 'name', title: 'a', course: 'b', file: '实验.pdf' },
      { id: 'course', title: 'a', course: '物理实验' },
      { id: 'title', title: '实验三', course: 'b' },
    ];
    expect(ids('实验', list)).toEqual([
      'title',
      'course',
      'name',
      'person',
      'body',
    ]);
  });

  it('ranks a whole field over its start over inside it over an abbreviation', () => {
    const list: Item[] = [
      { id: 'abbreviation', title: '数学分析', course: 'x' },
      { id: 'inside', title: '复习数分', course: 'x' },
      { id: 'start', title: '数分习题', course: 'x' },
      { id: 'whole', title: '数分', course: 'x' },
    ];
    expect(ids('数分', list)).toEqual([
      'whole',
      'start',
      'inside',
      'abbreviation',
    ]);
  });

  it('ranks a whole word over one in pieces', () => {
    const list: Item[] = [
      { id: 'pieces', title: '网络', course: '作业' },
      { id: 'whole', title: '网络作业', course: 'x' },
    ];
    expect(ids('网络作业', list)).toEqual(['whole', 'pieces']);
  });

  it('ranks an English word at a word start over one inside a word', () => {
    expect(ids('lab')).toEqual(['lab']);
    const list: Item[] = [
      { id: 'inside', title: 'syllabus', course: 'x' },
      { id: 'start', title: 'final lab', course: 'x' },
    ];
    expect(ids('lab', list)).toEqual(['start', 'inside']);
  });

  it('puts items needing attention first among equal matches, else keeps the order', () => {
    const list: Item[] = [
      { id: 'a', title: '作业一', course: 'x' },
      { id: 'b', title: '作业二', course: 'x', urgent: true },
      { id: 'c', title: '作业三', course: 'x' },
    ];
    expect(ids('作业', list)).toEqual(['b', 'a', 'c']);
  });

  it('reads each item once while the item object lives', () => {
    const get = jest.fn((i: Item) => i.title);
    const counted: SearchSpec<Item> = {
      fields: [{ get, tier: SearchTier.Title }],
      attention: () => false,
    };
    const list = [{ id: 'a', title: 'x', course: 'y' }];
    searchItems(list, 'x', counted, 0);
    searchItems(list, 'xy', counted, 0);
    expect(get).toHaveBeenCalledTimes(1);
  });
});

describe('searchHits', () => {
  it('gives each result its score, best first', () => {
    const hits = searchHits(items, '数据结构', spec, 0);
    expect(hits.map(hit => hit.item.id)).toEqual(['ds-hw', 'ds-notice']);
    expect(hits[0].score).toBe(hits[1].score);
    expect(hits[0].score).toBeGreaterThan(0);
  });
});

describe('matchRanges', () => {
  it('finds every place a word appears, ignoring case, merged', () => {
    expect(matchRanges('Lab 1 and lab 2', ['lab'])).toEqual([
      [0, 3],
      [10, 13],
    ]);
    expect(matchRanges('abcd', ['abc', 'bcd'])).toEqual([[0, 4]]);
  });

  it('finds a Han word the text holds only in pieces, longest first', () => {
    // 数据结构作业 as 数据结构 and 作业
    expect(matchRanges('数据结构第五次作业', ['数据结构作业'])).toEqual([
      [0, 4],
      [7, 9],
    ]);
    expect(matchRanges('没有', ['数据'])).toEqual([]);
  });
});

describe('snippet', () => {
  const text = `${'很长的开头'.repeat(10)}期中考试在三教`;

  it('starts a little before a match the preview would cut off', () => {
    expect(snippet(text, ['三教'])).toBe('…很长的开头期中考试在三教');
  });

  it('keeps text whose first match is near its start, or that has none', () => {
    expect(snippet(text, ['很长'])).toBe(text);
    expect(snippet(text, ['物理'])).toBe(text);
  });
});
