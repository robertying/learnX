import {
  fileNameOf,
  fileTypeColor,
  formatFileSize,
  getExtension,
  sanitizeFileName,
  stripExtension,
  withExtension,
} from 'helpers/filename';

describe('getExtension', () => {
  it('returns the text after the last dot', () => {
    expect(getExtension('report.final.pdf')).toBe('pdf');
  });

  it('is empty for a name without an extension', () => {
    expect(getExtension('README')).toBe('');
    expect(getExtension('')).toBe('');
  });

  it('treats a leading dot as part of the name', () => {
    expect(getExtension('.bashrc')).toBe('');
  });
});

describe('stripExtension', () => {
  it('drops only the last extension', () => {
    expect(stripExtension('archive.tar.gz')).toBe('archive.tar');
  });

  it('keeps a name without an extension', () => {
    expect(stripExtension('README')).toBe('README');
    expect(stripExtension('.bashrc')).toBe('.bashrc');
  });
});

describe('withExtension', () => {
  it('adds the extension only when there is one', () => {
    expect(withExtension('notes', 'txt')).toBe('notes.txt');
    expect(withExtension('notes', '')).toBe('notes');
    expect(withExtension('notes', null)).toBe('notes');
  });
});

describe('sanitizeFileName', () => {
  it('replaces separators and characters file systems reject', () => {
    expect(sanitizeFileName('a/b\\c:d*e?f"g<h>i|j\u0001k')).toBe(
      'a_b_c_d_e_f_g_h_i_j_k',
    );
  });

  it('drops leading dots and trailing dots and spaces', () => {
    expect(sanitizeFileName('..hidden. ')).toBe('hidden');
    expect(sanitizeFileName('..')).toBe('_');
  });

  it('cuts a long name to 255 bytes and keeps the suffix whole', () => {
    const name = sanitizeFileName('作'.repeat(200), '.pdf');
    expect(name.endsWith('.pdf')).toBe(true);
    expect(new TextEncoder().encode(name).length).toBeLessThanOrEqual(255);
    // 3 bytes a character: 251 bytes leave room for 83 whole characters.
    expect(name).toBe(`${'作'.repeat(83)}.pdf`);
  });
});

describe('fileNameOf', () => {
  it('names a file by its title and type', () => {
    expect(fileNameOf({ title: 'Lab 1/2', fileType: 'pdf' })).toBe(
      'Lab 1_2.pdf',
    );
  });

  it('adds no dot when there is no type', () => {
    expect(fileNameOf({ title: 'README', fileType: '' })).toBe('README');
  });
});

describe('formatFileSize', () => {
  it('shows bytes below 1 KB', () => {
    expect(formatFileSize(999)).toBe('999 B');
  });

  it('uses 1000-based units with one decimal', () => {
    expect(formatFileSize(1500)).toBe('1.5 KB');
    expect(formatFileSize(2_000_000)).toBe('2.0 MB');
    expect(formatFileSize(3_500_000_000)).toBe('3.5 GB');
  });

  it('moves to the next unit instead of showing 1000.0', () => {
    expect(formatFileSize(999_950)).toBe('1.0 MB');
    expect(formatFileSize(999_940)).toBe('999.9 KB');
  });
});

describe('fileTypeColor', () => {
  it('colors a tile by kind of document, in any case', () => {
    expect(fileTypeColor('PDF')).toBe('red');
    expect(fileTypeColor('docx')).toBe('blue');
    expect(fileTypeColor('key')).toBe('orange');
    expect(fileTypeColor('csv')).toBe('green');
    expect(fileTypeColor('zip')).toBe('grey');
    expect(fileTypeColor('')).toBe('grey');
  });
});
