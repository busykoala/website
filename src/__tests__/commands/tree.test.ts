import { describe, it, expect } from 'vitest';
import { treeAsync } from '../../commands/treeAsync';
import type { CommandContext } from '../../core/TerminalCore';
import { FileSystem } from '../../core/filesystem';
import { addBaseFilesystem } from '../../core/addBaseFilesystem';

function io() {
  const out: string[] = [],
    err: string[] = [];
  return {
    stdout: { write: (d: string) => out.push(d), on: () => {} },
    stderr: { write: (d: string) => err.push(d), on: () => {} },
    stdin: { read: () => '', on: () => {} },
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
    'file.txt',
    'busykoala',
    'busygroup',
    'busykoala',
    'busygroup',
    'x',
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

describe('tree', () => {
  it('renders tree for current directory', async () => {
    const c = ctx();
    const streams = io();
    const code = await treeAsync([], c, streams);
    expect(code).toBe(0);
    const out = (streams as any)._stdout.join('');
    expect(out).toContain('<div');
    expect(out).toContain('file.txt');
  });

  it('shows help', async () => {
    const c = ctx();
    const streams = io();
    const code = await treeAsync(['--help'], c, streams);
    expect(code).toBe(0);
    expect((streams as any)._stdout.join('').toLowerCase()).toContain('tree');
  });

  it('shows version', async () => {
    const c = ctx();
    const streams = io();
    const code = await treeAsync(['--version'], c, streams);
    expect(code).toBe(0);
    expect((streams as any)._stdout.join('')).toMatch(/tree .*1.0.0/);
  });

  it('includes hidden files with -a', async () => {
    const c = ctx();
    const fs = (c.terminal as any).getFileSystem();
    fs.addFile(
      '/home/busykoala/proj',
      '.hidden',
      'busykoala',
      'busygroup',
      'busykoala',
      'busygroup',
      '',
      'rw-r--r--',
    );
    const streams1 = io();
    await treeAsync([], c, streams1);
    expect((streams1 as any)._stdout.join('')).not.toContain('.hidden');
    const streams2 = io();
    const code = await treeAsync(['-a'], c, streams2);
    expect(code).toBe(0);
    expect((streams2 as any)._stdout.join('')).toContain('.hidden');
  });

  it('lists only directories with -d', async () => {
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
      'inner.txt',
      'busykoala',
      'busygroup',
      'busykoala',
      'busygroup',
      'hi',
      'rw-r--r--',
    );
    const streams = io();
    const code = await treeAsync(['-d'], c, streams);
    expect(code).toBe(0);
    const out = (streams as any)._stdout.join('');
    expect(out).toContain('<strong>sub</strong>');
    expect(out).not.toContain('file.txt');
    expect(out).not.toContain('inner.txt');
  });

  it('limits depth with -L', async () => {
    const c = ctx();
    const fs = (c.terminal as any).getFileSystem();
    fs.addDirectory(
      '/home/busykoala/proj',
      'a',
      'busykoala',
      'busygroup',
      'busykoala',
      'busygroup',
    );
    fs.addDirectory(
      '/home/busykoala/proj/a',
      'b',
      'busykoala',
      'busygroup',
      'busykoala',
      'busygroup',
    );
    const s1 = io();
    await treeAsync(['-L', '1'], c, s1);
    const out1 = (s1 as any)._stdout.join('');
    expect(out1).toContain('<strong>a</strong>');
    expect(out1).not.toContain('<strong>b</strong>');
    const s2 = io();
    await treeAsync(['-L', '2'], c, s2);
    const out2 = (s2 as any)._stdout.join('');
    expect(out2).toContain('<strong>a</strong>');
    expect(out2).toContain('<strong>b</strong>');
  });

  it('shows full paths with -f', async () => {
    const c = ctx();
    const streams = io();
    const code = await treeAsync(['-f'], c, streams);
    expect(code).toBe(0);
    const out = (streams as any)._stdout.join('');
    expect(out).toContain('/home/busykoala/proj/file.txt');
  });

  it('omits branch characters with -i', async () => {
    const c = ctx();
    const fs = (c.terminal as any).getFileSystem();
    fs.addDirectory(
      '/home/busykoala/proj',
      'dir',
      'busykoala',
      'busygroup',
      'busykoala',
      'busygroup',
    );
    const s1 = io();
    await treeAsync([], c, s1);
    const out1 = (s1 as any)._stdout.join('');
    expect(out1).toMatch(/&#9492;|&#9500;/);
    const s2 = io();
    await treeAsync(['-i'], c, s2);
    const out2 = (s2 as any)._stdout.join('');
    expect(out2).not.toMatch(/&#9492;|&#9500;/);
  });

  it('classifies with -F', async () => {
    const c = ctx();
    const fs = (c.terminal as any).getFileSystem();
    fs.addDirectory(
      '/home/busykoala/proj',
      'bin',
      'busykoala',
      'busygroup',
      'busykoala',
      'busygroup',
    );
    fs.addFile(
      '/home/busykoala/proj',
      'run.sh',
      'busykoala',
      'busygroup',
      'busykoala',
      'busygroup',
      '#!/bin/sh',
      'rwxr-xr-x',
    );
    const streams = io();
    const code = await treeAsync(['-F'], c, streams);
    expect(code).toBe(0);
    const out = (streams as any)._stdout.join('');
    // directory has trailing /
    expect(out).toContain('<strong>bin/</strong>');
    // executable file has trailing *
    expect(out).toContain('run.sh*');
    // without -F there should be no suffixes
    const s2 = io();
    await treeAsync([], c, s2);
    const out2 = (s2 as any)._stdout.join('');
    expect(out2).toContain('<strong>bin</strong>');
    expect(out2).not.toContain('<strong>bin/</strong>');
    expect(out2).toContain('run.sh');
    expect(out2).not.toContain('run.sh*');
  });
});
