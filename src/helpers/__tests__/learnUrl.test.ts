import { loadsFromWebLearning } from 'helpers/learnUrl';

describe('loadsFromWebLearning', () => {
  it('finds sources on Web Learning, relative ones included', () => {
    expect(
      loadsFromWebLearning(
        '<img src="https://learn.tsinghua.edu.cn/b/wlxt/kj/image?id=1">',
      ),
    ).toBe(true);
    expect(loadsFromWebLearning("<img alt='x' src='/b/image?id=1'>")).toBe(
      true,
    );
    expect(loadsFromWebLearning('<IMG SRC=b/image?id=1>')).toBe(true);
    expect(
      loadsFromWebLearning('<img src="http://learn.tsinghua.edu.cn/a.png">'),
    ).toBe(true);
  });

  it('ignores other sites, data, and links', () => {
    expect(loadsFromWebLearning('<p>Hi</p>')).toBe(false);
    expect(
      loadsFromWebLearning('<img src="https://www.tsinghua.edu.cn/a.png">'),
    ).toBe(false);
    expect(
      loadsFromWebLearning(
        '<img src="https://learn.tsinghua.edu.cn.example.com/a.png">',
      ),
    ).toBe(false);
    expect(loadsFromWebLearning('<img src="data:image/png;base64,AAAA">')).toBe(
      false,
    );
    expect(
      loadsFromWebLearning('<a href="https://learn.tsinghua.edu.cn/f">f</a>'),
    ).toBe(false);
    // Text that mentions a source isn't one.
    expect(loadsFromWebLearning('<p>datasrc = 1</p>')).toBe(false);
  });
});
