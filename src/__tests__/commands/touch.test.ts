import { describe, it, expect } from 'vitest';
import { touchAsync } from '../../commands/touchAsync';
import type { CommandContext } from '../../core/TerminalCore';
import type { IOStreams } from '../../core/streams';
import { FileSystem } from '../../core/filesystem';
import { addBaseFilesystem } from '../../core/addBaseFilesystem';

function io(): IOStreams {
  return {
    stdout: { write: () => {} } as any,
    stderr: { write: () => {} } as any,
    stdin: { read: () => '', on: () => {} } as any,
  } as any;
}

function ctx(): CommandContext {
  const fs = new FileSystem();
  addBaseFilesystem(fs);
  return {
    env: {
      PWD: '/home/busykoala',
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
  };
}

describe('touch', () => {
  it('creates a new file', async () => {
    const c = ctx();
    const fs = c.terminal.getFileSystem();
    const code = await touchAsync(['newfile.txt'], c, io());
    expect(code).toBe(0);
    expect(fs.getNode('/home/busykoala/newfile.txt', 'busykoala', 'busygroup')).toBeTruthy();
  });

  it('updates modified time of existing file', async () => {
    const c = ctx();
    const fs = c.terminal.getFileSystem();
    fs.addFile(
      '/home/busykoala',
      'f.txt',
      'busykoala',
      'busygroup',
      'busykoala',
      'busygroup',
      'x',
      'rw-r--r--',
    );
    const before = (fs.getNode('/home/busykoala/f.txt', 'busykoala', 'busygroup') as any)
      .modified as Date;
    await new Promise((r) => setTimeout(r, 10));
    const code = await touchAsync(['f.txt'], c, io());
    expect(code).toBe(0);
    const after = (fs.getNode('/home/busykoala/f.txt', 'busykoala', 'busygroup') as any)
      .modified as Date;
    expect(after.getTime()).toBeGreaterThan(before.getTime());
  });

  it('does not create with -c when file missing', async () => {
    const c = ctx();
    const fs = c.terminal.getFileSystem();
    const code = await touchAsync(['-c', 'nope.txt'], c, io());
    expect(code).toBe(0);
    expect(() => fs.getNode('/home/busykoala/nope.txt', 'busykoala', 'busygroup')).toThrow();
  });

  it('sets time with -d', async () => {
    const c = ctx();
    const fs = c.terminal.getFileSystem();
    const dateStr = '2020-01-02T03:04:05Z';
    let code = await touchAsync(['-d', dateStr, 'd1'], c, io());
    expect(code).toBe(0);
    const node = fs.getNode('/home/busykoala/d1', 'busykoala', 'busygroup') as any;
    expect(node.modified.getTime()).toBe(new Date(dateStr).getTime());
  });

  it('sets time with -t using CCYYMMDDhhmm[.ss]', async () => {
    const c = ctx();
    const fs = c.terminal.getFileSystem();
    const code = await touchAsync(['-t', '202501011234.56', 't1'], c, io());
    expect(code).toBe(0);
    const node = fs.getNode('/home/busykoala/t1', 'busykoala', 'busygroup') as any;
    const expected = new Date(2025, 0, 1, 12, 34, 56);
    expect(node.modified.getFullYear()).toBe(expected.getFullYear());
    expect(node.modified.getMonth()).toBe(expected.getMonth());
    expect(node.modified.getDate()).toBe(expected.getDate());
    expect(node.modified.getHours()).toBe(expected.getHours());
    expect(node.modified.getMinutes()).toBe(expected.getMinutes());
    expect(node.modified.getSeconds()).toBe(expected.getSeconds());
  });

  it('sets time from reference file with -r', async () => {
    const c = ctx();
    const fs = c.terminal.getFileSystem();
    fs.addFile(
      '/home/busykoala',
      'ref',
      'busykoala',
      'busygroup',
      'busykoala',
      'busygroup',
      'x',
      'rw-r--r--',
    );
    const refNode = fs.getNode('/home/busykoala/ref', 'busykoala', 'busygroup') as any;
    refNode.modified = new Date(1234567890000);
    const code = await touchAsync(['-r', 'ref', 'copy'], c, io());
    expect(code).toBe(0);
    const copy = fs.getNode('/home/busykoala/copy', 'busykoala', 'busygroup') as any;
    expect(copy.modified.getTime()).toBe(refNode.modified.getTime());
  });

  it('errors on missing operand', async () => {
    const c = ctx();
    const out: string[] = [];
    const err: string[] = [];
    const streams = {
      stdout: { write: (d: string) => out.push(d), on: () => {} },
      stderr: { write: (d: string) => err.push(d), on: () => {} },
      stdin: { read: () => '', on: () => {} },
    } as any;
    const code = await touchAsync([], c, streams);
    expect(code).toBe(1);
    expect(err.join('')).toContain('missing file operand');
  });

  it('shows help and version', async () => {
    const c = ctx();
    const out: string[] = [];
    const streams = {
      stdout: { write: (d: string) => out.push(d), on: () => {} },
      stderr: { write: () => {}, on: () => {} },
      stdin: { read: () => '', on: () => {} },
    } as any;
    let code = await touchAsync(['--help'], c, streams);
    expect(code).toBe(0);
    expect(out.join('').toLowerCase()).toContain('touch');
    out.length = 0;
    code = await touchAsync(['--version'], c, streams);
    expect(code).toBe(0);
    expect(out.join('')).toMatch(/GNU coreutils simulation|touch \(GNU coreutils simulation\)/i);
  });
});
