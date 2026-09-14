import { describe, expect, it } from 'vitest';
import { archiveImageNames, sanitizeArchiveName, uniqueArchiveName } from '../exportNaming';

describe('safe, lossless archive names', () => {
  it.each(['../escape', 'a/b', 'a\\b', '\u0000name', '..'])('removes path syntax: %s', name => {
    // eslint-disable-next-line no-control-regex
    expect(sanitizeArchiveName(name)).not.toMatch(/[/\\\u0000]/);
    expect(sanitizeArchiveName(name)).not.toBe('..');
  });
  it('handles Windows reserved names and empty names', () => {
    expect(sanitizeArchiveName('CON.txt')).toBe('_CON.txt');
    expect(sanitizeArchiveName('   ')).toBe('untitled');
  });
  it('reserves project folders case-insensitively', () => {
    const used = new Set<string>();
    expect(uniqueArchiveName('Dataset', used)).toBe('Dataset');
    expect(uniqueArchiveName('dataset', used)).toBe('dataset_2');
  });
  it('keeps same-stem captions distinct across image extensions', () => {
    const used = new Set<string>();
    expect(archiveImageNames('photo.jpg', 'txt', used)).toEqual({ image: 'photo.jpg', caption: 'photo.txt' });
    expect(archiveImageNames('photo.png', 'txt', used)).toEqual({ image: 'photo_2.png', caption: 'photo_2.txt' });
    expect(archiveImageNames('PHOTO.JPG', 'txt', used).image).toBe('PHOTO_3.JPG');
  });
  it('handles extensionless files and caption-like filenames', () => {
    expect(archiveImageNames('photo', 'json', new Set()).caption).toBe('photo.json');
    const names = archiveImageNames('photo.txt', 'txt', new Set());
    expect(names.image).not.toBe(names.caption);
  });
});
