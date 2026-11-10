import { removeTags } from 'helpers/text';

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

  it('is empty for nothing', () => {
    expect(removeTags()).toBe('');
    expect(removeTags('')).toBe('');
  });
});
