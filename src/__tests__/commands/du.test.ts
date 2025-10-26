import { describe, it, expect } from 'vitest';
import { duAsync } from '../../commands/duAsync';
import type { CommandContext } from '../../core/TerminalCore';
import type { IOStreams } from '../../core/streams';
import { FileSystem } from '../../core/filesystem';
import { addBaseFilesystem } from '../../core/addBaseFilesystem';

function io(): IOStreams & { _stdout: string[]; _stderr: string[] } {
  const out: string[] = [];
  const err: string[] = [];
  return {
    stdout: { write: (d: string) => out.push(d), on: () => {} } as any,
    stderr: { write: (d: string) => err.push(d), on: () => {} } as any,
    stdin: { read: () => '', on: () => {} } as any,
    _stdout: out,
    _stderr: err,
  } as any;
}
function ctx(): CommandContext {
  const fs = new FileSystem();
  addBaseFilesystem(fs);
  fs.addDirectory('/home/busykoala', 'proj', 'busykoala', 'busygroup', 'busykoala', 'busygroup');
  fs.addFile(
    '/home/busykoala/proj',
    'a.txt',
    'busykoala',
    'busygroup',
    'busykoala',
    'busygroup',
    'abcd',
    'rw-r--r--',
  );
  fs.addFile(
    '/home/busykoala/proj',
    'b.txt',
    'busykoala',
    'busygroup',
    'busykoala',
    'busygroup',
    'xyz',
    'rw-r--r--',
  );
  return {
    env: {
      PWD: '/home/busykoala/proj',
      HOME: '/home/busykoala',
      USER: 'busykoala',
      SHELL: '/bin/zsh',
      PATH: '/bin',
      EDITOR: 'nvim',
      COMMANDS: {},
      LAST_EXIT_CODE: '0',
    },
    version: '2.0.0',
    history: [],
    files: {},
    terminal: { getFileSystem: () => fs } as any,
    shell: null as any,
  } as any;
}

describe('du', () => {
  it('reports size for current directory by default', async () => {
    const c = ctx();
    const streams = io();
    const code = await duAsync([], c, streams);
    expect(code).toBe(0);
    const out = streams._stdout.join('');
    // size should be sum of file contents lengths (4 + 3 = 7)
    expect(out.startsWith('7 ')).toBe(true);
  });

  it('reports size for a file', async () => {
    const c = ctx();
    const streams = io();
    const code = await duAsync(['a.txt'], c, streams);
    expect(code).toBe(0);
    expect(streams._stdout.join('')).toMatch(/^4\s+a.txt$/);
  });

  it('shows help', async () => {
    const c = ctx();
    const streams = io();
    const code = await duAsync(['--help'], c, streams);
    expect(code).toBe(0);
    expect(streams._stdout.join('').toLowerCase()).toContain('du');
  });

  it('prints human-readable sizes with -h', async () => {
    const c = ctx();
    const s = io();
    await duAsync(['-h'], c, s);
    expect(s._stdout.join('')).toMatch(/\b7B\b/);
  });

  it('includes files with -a', async () => {
    const c = ctx();
    const s = io();
    await duAsync(['-a'], c, s);
    const out = s._stdout.join('');
    expect(out).toContain('a.txt');
    expect(out).toContain('b.txt');
  });

  it('limits depth with -d', async () => {
    const c = ctx();
    const s = io();
    await duAsync(['-d', '0'], c, s);
    const out = s._stdout.join('');
    expect(out).not.toContain('a.txt');
    expect(out).not.toContain('b.txt');
  });

  it('summarizes with -s', async () => {
    const c = ctx();
    const s = io();
    await duAsync(['-s'], c, s);
    const lines = s._stdout.join('').split(/\n/).filter(Boolean);
    expect(lines.length).toBe(1);
  });

  it('separates directory size with -S (exclude subdir sizes)', async () => {
    const c = ctx();
    const fs = (c.terminal as any).getFileSystem();
    fs.addDirectory(
      '/home/busykoala/proj',
      'sub',
      'busykoala',
      'busygroup',
      'busykoala',
      'busygroup',
    );
    fs.addFile(
      '/home/busykoala/proj/sub',
      'c.txt',
      'busykoala',
      'busygroup',
      'busykoala',
      'busygroup',
      'hi',
      'rw-r--r--',
    ); // 2 bytes
    const s1 = io();
    await duAsync([], c, s1);
    const firstLine = s1._stdout.join('').split(/\n/)[0];
    const sizeDefault = parseInt(firstLine.split(' ')[0], 10);
    const s2 = io();
    await duAsync(['-S'], c, s2);
    const sizeS = parseInt(s2._stdout.join('').split(/\n/)[0].split(' ')[0], 10);
    expect(sizeDefault).toBe(9); // 4+3+2
    expect(sizeS).toBe(7); // excludes subdir file
  });

  it('shows grand total with -c', async () => {
    const c = ctx();
    const s = io();
    await duAsync(['-a', '-c'], c, s);
    const out = s._stdout.join('');
    expect(out).toMatch(/\btotal\b/);
  });
});
