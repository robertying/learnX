// The Web Learning link rule (helpers/preval/csrfLinks.js): the notice and
// assignment web views run it, and helpers/learnUrl uses it in the app.

describe('CSRF links', () => {
  const {
    addCSRFTokenToUrl,
    addCSRFTokenToLinks,
  } = require('helpers/preval/csrfLinks.js');
  const base = 'https://learn.tsinghua.edu.cn/';

  it('adds the token to course-site URLs, relative ones included', () => {
    expect(
      addCSRFTokenToUrl('https://learn.tsinghua.edu.cn/b/file?id=1', 't', base),
    ).toBe('https://learn.tsinghua.edu.cn/b/file?id=1&_csrf=t');
    expect(addCSRFTokenToUrl('/b/file?id=2', 't', base)).toBe(
      'https://learn.tsinghua.edu.cn/b/file?id=2&_csrf=t',
    );
  });

  it('leaves other sites, anchors and other schemes alone', () => {
    expect(addCSRFTokenToUrl('https://example.com/a', 't', base)).toBeNull();
    expect(addCSRFTokenToUrl('mailto:ta@tsinghua.edu.cn', 't', base)).toBe(
      null,
    );
    expect(
      addCSRFTokenToUrl(['javascript', 'void(0)'].join(':'), 't', base),
    ).toBeNull();
    expect(addCSRFTokenToUrl('#section-2', 't', base)).toBeNull();
    expect(addCSRFTokenToUrl('http://[bad', 't', base)).toBeNull();
  });

  it('only gives the token to Web Learning itself, over https', () => {
    expect(
      addCSRFTokenToUrl('https://xlearn.tsinghua.edu.cn/a', 't', base),
    ).toBeNull();
    expect(
      addCSRFTokenToUrl('https://eviltsinghua.edu.cn/a', 't', base),
    ).toBeNull();
    expect(addCSRFTokenToUrl('https://id.tsinghua.edu.cn/a', 't', base)).toBe(
      null,
    );
    expect(
      addCSRFTokenToUrl('http://learn.tsinghua.edu.cn/b/file?id=1', 't', base),
    ).toBe('https://learn.tsinghua.edu.cn/b/file?id=1&_csrf=t');
  });

  it('keeps going after a link it cannot use', () => {
    const elements = [
      ['href', 'http://[bad'],
      ['href', '#top'],
      ['href', '/b/download?id=3'],
      ['src', 'https://learn.tsinghua.edu.cn/img.png'],
    ].map(([attribute, value]) => {
      const attributes: Record<string, string> = { [attribute]: value };
      return {
        attribute,
        attributes,
        getAttribute: (name: string) => attributes[name] ?? null,
        setAttribute: (name: string, v: string) => {
          attributes[name] = v;
        },
      };
    });
    const root = {
      querySelectorAll: (selector: string) =>
        elements.filter(e => selector === `[${e.attribute}]`),
    };

    addCSRFTokenToLinks(root, 't', base);

    expect(elements.map(e => e.attributes[e.attribute])).toEqual([
      'http://[bad',
      '#top',
      'https://learn.tsinghua.edu.cn/b/download?id=3&_csrf=t',
      'https://learn.tsinghua.edu.cn/img.png?_csrf=t',
    ]);
  });
});
