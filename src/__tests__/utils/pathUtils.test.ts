import { describe, it, expect } from 'vitest';
import {
  resolvePath,
  normalizePath,
  dirname,
  basename,
  joinPath,
  extname,
  splitPath,
  isDescendant,
  relativePath,
  expandHome,
  collapseHome,
} from '../../utils/pathUtils';

describe('utils/pathUtils', () => {
  it('resolvePath handles absolute and relative paths', () => {
    expect(resolvePath('/etc/passwd', '/home/user')).toBe('/etc/passwd');
    expect(resolvePath('file.txt', '/home/user')).toBe('/home/user/file.txt');
    expect(resolvePath('../x', '/home/user/docs')).toBe('/home/user/x');
    expect(resolvePath('./a/./b/..', '/')).toBe('/a');
  });

  it('normalizePath resolves . and .. and preserves root', () => {
    expect(normalizePath('/a/b/../c')).toBe('/a/c');
    expect(normalizePath('/')).toBe('/');
    expect(normalizePath('')).toBe('.');
    expect(normalizePath('a/../..')).toBe('..');
  });

  it('dirname and basename work for edge cases', () => {
    expect(dirname('/a/b/c.txt')).toBe('/a/b');
    expect(basename('/a/b/c.txt')).toBe('c.txt');
    expect(dirname('/')).toBe('/');
    expect(basename('/')).toBe('/');
    expect(basename('/a/b/')).toBe('b');
    expect(dirname('a')).toBe('.');
  });

  it('joinPath and extname', () => {
    expect(joinPath('/a/', '/b', 'c')).toBe('/a/b/c');
    expect(extname('foo.bar')).toBe('.bar');
    expect(extname('.bashrc')).toBe('');
  });

  it('splitPath and isDescendant', () => {
    expect(splitPath('/a/b/c')).toEqual({ dir: '/a/b', base: 'c' });
    expect(isDescendant('/a/b/c', '/a')).toBe(true);
    expect(isDescendant('/a', '/a')).toBe(false);
  });

  it('relativePath between two paths', () => {
    expect(relativePath('/a/b/c', '/a/b/c/d/e')).toBe('d/e');
    expect(relativePath('/a/b/c', '/a/x')).toBe('../../x');
    expect(relativePath('/a/b', '/a/b')).toBe('.');
  });

  it('expandHome and collapseHome', () => {
    expect(expandHome('~', '/home/u')).toBe('/home/u');
    expect(expandHome('~/docs', '/home/u')).toBe('/home/u/docs');
    expect(expandHome('/x', '/home/u')).toBe('/x');
    expect(collapseHome('/home/u/docs', '/home/u')).toBe('~/docs');
    expect(collapseHome('/x', '/home/u')).toBe('/x');
  });
});
