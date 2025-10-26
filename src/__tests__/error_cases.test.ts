import { describe, it, expect } from 'vitest';
import type { CommandContext } from '../core/TerminalCore';
import type { IOStreams } from '../core/streams';
import { FileSystem } from '../core/filesystem';
import { addBaseFilesystem } from '../core/addBaseFilesystem';

import { catAsync } from '../commands/catAsync';
import { headAsync } from '../commands/headAsync';
import { rmAsync } from '../commands/rmAsync';
import { lsAsync } from '../commands/lsAsync';
import { touchAsync } from '../commands/touchAsync';
import { grepAsync } from '../commands/grepAsync';

function io(): IOStreams & { _stdout: string[]; _stderr: string[] } {
  const out: string[] = [],
    err: string[] = [];
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
  } as any;
}

describe('error cases: permissions, not found, invalid flags', () => {
  it('cat: errors for missing file and permission denied', async () => {
    const c = ctx();
    const s = io();
    // missing file
    let code = await catAsync(['nope.txt'], c, s);
    expect(code).toBe(1);
    expect(s._stderr.join('').toLowerCase()).toContain('no such file');

    // permission denied
    const fs = c.terminal.getFileSystem();
    fs.addFile(
      '/home/busykoala',
      'secret.txt',
      'busykoala',
      'busygroup',
      'busykoala',
      'busygroup',
      'top secret',
      '---------',
    );
    const s2 = io();
    code = await catAsync(['secret.txt'], c, s2);
    expect(code).toBe(1);
    expect(s2._stderr.join('').toLowerCase()).toContain('permission denied');
  });

  it('head: errors for missing file, directory input, and treats invalid flag as filename', async () => {
    const c = ctx();
    const s = io();
    let code = await headAsync(['missing.txt'], c, s);
    expect(code).toBe(1);
    expect(s._stderr.join('').toLowerCase()).toContain("cannot open 'missing.txt'");

    const fs = c.terminal.getFileSystem();
    fs.addDirectory('/home/busykoala', 'adir', 'busykoala', 'busygroup', 'busykoala', 'busygroup');
    const s2 = io();
    code = await headAsync(['adir'], c, s2);
    expect(code).toBe(1);
    expect(s2._stderr.join('').toLowerCase()).toContain('is a directory');

    // invalid flag -z -> treated as filename "-z" which should be not found
    const s3 = io();
    code = await headAsync(['-z'], c, s3);
    expect(code).toBe(1);
    expect(s3._stderr.join('').toLowerCase()).toContain("cannot open '-z'");
  });

  it('rm: errors for missing operand, not found (unless -f), and permission denied', async () => {
    const c = ctx();
    // missing operand
    let streams = io();
    let code = await rmAsync([], c, streams);
    expect(code).toBe(1);
    expect(streams._stderr.join('').toLowerCase()).toContain('missing operand');

    // not found without -f
    streams = io();
    code = await rmAsync(['nope.txt'], c, streams);
    expect(code).toBe(1);
    expect(streams._stderr.join('').toLowerCase()).toContain('cannot remove');

    // not found with -f succeeds
    streams = io();
    code = await rmAsync(['-f', 'nope.txt'], c, streams);
    expect(code).toBe(0);

    // permission denied removing file without write perms
    const fs = c.terminal.getFileSystem();
    fs.addFile(
      '/home/busykoala',
      'ro.txt',
      'busykoala',
      'busygroup',
      'busykoala',
      'busygroup',
      'x',
      'r--r--r--',
    );
    streams = io();
    code = await rmAsync(['ro.txt'], c, streams);
    expect(code).toBe(1);
    expect(streams._stderr.join('').toLowerCase()).toContain('permission denied');
  });

  it('ls: errors for missing path', async () => {
    const c = ctx();
    const s = io();
    const code = await lsAsync(['no_such_path'], c, s);
    expect(code).toBe(1);
    expect(s._stderr.join('').toLowerCase()).toContain("cannot access 'no_such_path'");
  });

  it('ls: permission denied for unreadable directory', async () => {
    const c = ctx();
    const s = io();
    const fs = c.terminal.getFileSystem();
    fs.addDirectory(
      '/home/busykoala',
      'nowrite',
      'busykoala',
      'busygroup',
      'busykoala',
      'busygroup',
      '--x--x--x',
    );
    const code = await lsAsync(['nowrite'], c, s);
    expect(code).toBe(1);
    expect(s._stderr.join('').toLowerCase()).toContain('permission denied');
  });

  it('touch: errors when touching a directory and creating in non-writable dir', async () => {
    const c = ctx();
    const fs = c.terminal.getFileSystem();
    fs.addDirectory('/home/busykoala', 'adir', 'busykoala', 'busygroup', 'busykoala', 'busygroup');
    let s = io();
    let code = await touchAsync(['adir'], c, s);
    expect(code).toBe(1);
    expect(s._stderr.join('').toLowerCase()).toContain('not a file');

    // non-writable directory
    fs.addDirectory(
      '/home/busykoala',
      'nowrite',
      'busykoala',
      'busygroup',
      'busykoala',
      'busygroup',
      'r-xr-xr-x',
    );
    s = io();
    code = await touchAsync(['nowrite/new.txt'], c, s);
    expect(code).toBe(1);
    expect(s._stderr.join('').toLowerCase()).toContain('permission denied');
  });

  it('grep: errors for missing pattern and directory operand', async () => {
    const c = ctx();
    let s = io();
    let code = await grepAsync([], c, s);
    expect(code).toBe(1);
    expect(s._stderr.join('').toLowerCase()).toContain('missing pattern');

    const fs = c.terminal.getFileSystem();
    fs.addDirectory('/home/busykoala', 'adir', 'busykoala', 'busygroup', 'busykoala', 'busygroup');
    s = io();
    code = await grepAsync(['x', 'adir'], c, s);
    expect(code).toBe(1);
    expect(s._stderr.join('').toLowerCase()).toContain('is a directory');
  });
});
