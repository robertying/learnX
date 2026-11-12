import { capitalize, hash, removeTags } from 'helpers/text';

describe('removeTags', () => {
  it('drops tags and decodes entities', () => {
    expect(removeTags('<p class="x">A &amp; B</p>')).toBe('A & B');
  });

  it('drops comments, also across lines and with > inside', () => {
    expect(removeTags('before<!-- a\n> b\n-->after')).toBe('beforeafter');
  });

  it('drops tags that span lines', () => {
    expect(removeTags('<a\n href="x">link</a>')).toBe('link');
  });

  it('collapses runs of whitespace', () => {
    expect(removeTags('  one   two \n\n three ')).toBe('one two three');
  });

  it('keeps words apart across paragraphs, lines and cells', () => {
    expect(removeTags('<p>Hello</p><p>world</p>')).toBe('Hello world');
    expect(removeTags('one<br>two<br/>three')).toBe('one two three');
    expect(removeTags('<ul><li>a</li><li>b</li></ul>')).toBe('a b');
    expect(removeTags('<table><tr><td>x</td><td>y</td></tr></table>')).toBe(
      'x y',
    );
  });

  it('keeps inline tags inside a word', () => {
    expect(removeTags('<b>bold</b>er and <a href="x">li</a>nk')).toBe(
      'bolder and link',
    );
  });

  it('drops styles and scripts with their content', () => {
    expect(
      removeTags(
        '<style type="text/css">p { color: red }</style><p>Hi</p><script>alert(1)</script>',
      ),
    ).toBe('Hi');
    expect(removeTags('<STYLE>\n.a{}\n</STYLE >text')).toBe('text');
  });

  it('is empty for nothing', () => {
    expect(removeTags()).toBe('');
    expect(removeTags('')).toBe('');
  });
});

describe('capitalize', () => {
  it('uppercases the first letter only', () => {
    expect(capitalize('due today at 9:00')).toBe('Due today at 9:00');
    expect(capitalize('今天截止')).toBe('今天截止');
    expect(capitalize('')).toBe('');
  });
});

describe('hash', () => {
  it('is stable and hex', () => {
    expect(hash('')).toBe('1505');
    expect(hash('learnX')).toBe(hash('learnX'));
    expect(hash('learnX')).toMatch(/^[0-9a-f]+$/);
    expect(hash('a')).not.toBe(hash('b'));
  });
});
