import { describe, it, expect } from 'vitest';
import { rmAsync } from '../../commands/rmAsync';
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

describe('rm', () => {
  it('removes a file', async () => {
    const c = ctx();
    const streams = io();
    const fs = c.terminal.getFileSystem();
    const code = await rmAsync(['f.txt'], c, streams);
    expect(code).toBe(0);
    expect(() => fs.getNode('/home/busykoala/f.txt', 'busykoala', 'busygroup')).toThrow();
  });

  it('errors on missing operand', async () => {
    const c = ctx();
    const streams = io();
    const code = await rmAsync([], c, streams);
    expect(code).toBe(1);
    expect((streams as any)._stderr.join('')).toContain('missing operand');
  });

  it('shows help', async () => {
    const c = ctx();
    const streams = io();
    const code = await rmAsync(['--help'], c, streams);
    expect(code).toBe(0);
    expect((streams as any)._stdout.join('').toLowerCase()).toContain('rm');
  });

  it('rm -f with no operands succeeds', async () => {
    const c = ctx();
    const streams = io();
    const code = await rmAsync(['-f'], c, streams);
    expect(code).toBe(0);
  });

  it('rm -f ignores nonexistent files', async () => {
    const c = ctx();
    const streams = io();
    const code = await rmAsync(['-f', 'nope.txt'], c, streams);
    expect(code).toBe(0);
    expect((streams as any)._stderr.join('')).toBe('');
  });

  it('rm -i prompts and aborts', async () => {
    const c = ctx();
    const streams = io();
    const code = await rmAsync(['-i', 'f.txt'], c, streams);
    expect(code).toBe(1);
    const msg = (streams as any)._stderr.join('');
    expect(msg).toMatch(/remove .* 'f.txt'\?/);
    // file still exists
    expect(
      c.terminal.getFileSystem().getNode('/home/busykoala/f.txt', 'busykoala', 'busygroup'),
    ).toBeTruthy();
  });

  it('rm -I prompts once and aborts for many files or recursive', async () => {
    const c = ctx();
    const streams = io();
    const fs = c.terminal.getFileSystem();
    fs.addFile(
      '/home/busykoala',
      'g.txt',
      'busykoala',
      'busygroup',
      'busykoala',
      'busygroup',
      'y',
      'rw-r--r--',
    );
    fs.addFile(
      '/home/busykoala',
      'h.txt',
      'busykoala',
      'busygroup',
      'busykoala',
      'busygroup',
      'z',
      'rw-r--r--',
    );
    let code = await rmAsync(['-I', 'f.txt', 'g.txt', 'h.txt', 'extra.txt'], c, streams);
    expect(code).toBe(1);
    expect((streams as any)._stderr.join('')).toMatch(/remove .*\?/);
    // recursive case
    fs.addDirectory('/home/busykoala', 'dir', 'busykoala', 'busygroup', 'busykoala', 'busygroup');
    (streams as any)._stderr.length = 0;
    code = await rmAsync(['-I', '-r', 'dir'], c, streams);
    expect(code).toBe(1);
    expect((streams as any)._stderr.join('')).toMatch(/remove .*recursively/);
  });

  it('rm -d removes empty directory and errors for non-empty', async () => {
    const c = ctx();
    const streams = io();
    const fs = c.terminal.getFileSystem();
    fs.addDirectory('/home/busykoala', 'empty', 'busykoala', 'busygroup', 'busykoala', 'busygroup');
    let code = await rmAsync(['-d', 'empty'], c, streams);
    expect(code).toBe(0);
    expect(() => fs.getNode('/home/busykoala/empty', 'busykoala', 'busygroup')).toThrow();
    fs.addDirectory('/home/busykoala', 'nd', 'busykoala', 'busygroup', 'busykoala', 'busygroup');
    fs.addFile(
      '/home/busykoala/nd',
      'x',
      'busykoala',
      'busygroup',
      'busykoala',
      'busygroup',
      '1',
      'rw-r--r--',
    );
    streams._stderr.length = 0;
    code = await rmAsync(['-d', 'nd'], c, streams);
    expect(code).toBe(1);
    expect(streams._stderr.join('')).toMatch(/Directory not empty/);
  });

  it('rm -r removes directory recursively (and -R alias)', async () => {
    const c = ctx();
    const fs = c.terminal.getFileSystem();
    const streams = io();
    fs.addDirectory('/home/busykoala', 'rmd', 'busykoala', 'busygroup', 'busykoala', 'busygroup');
    fs.addFile(
      '/home/busykoala/rmd',
      'file',
      'busykoala',
      'busygroup',
      'busykoala',
      'busygroup',
      'z',
      'rw-r--r--',
    );
    let code = await rmAsync(['-r', 'rmd'], c, streams);
    expect(code).toBe(0);
    expect(() => fs.getNode('/home/busykoala/rmd', 'busykoala', 'busygroup')).toThrow();
    fs.addDirectory('/home/busykoala', 'rmd2', 'busykoala', 'busygroup', 'busykoala', 'busygroup');
    fs.addFile(
      '/home/busykoala/rmd2',
      'file',
      'busykoala',
      'busygroup',
      'busykoala',
      'busygroup',
      'z',
      'rw-r--r--',
    );
    code = await rmAsync(['-R', 'rmd2'], c, streams);
    expect(code).toBe(0);
    expect(() => fs.getNode('/home/busykoala/rmd2', 'busykoala', 'busygroup')).toThrow();
  });

  it('rm -v prints verbose messages', async () => {
    const c = ctx();
    const streams = io();
    const fs = c.terminal.getFileSystem();
    fs.addDirectory('/home/busykoala', 'vdir', 'busykoala', 'busygroup', 'busykoala', 'busygroup');
    let code = await rmAsync(['-v', 'f.txt'], c, streams);
    expect(code).toBe(0);
    expect(streams._stdout.join('')).toMatch(/removed '.*f.txt'/);
    code = await rmAsync(['-r', '-v', 'vdir'], c, streams);
    expect(code).toBe(0);
    expect(streams._stdout.join('')).toMatch(/removed directory/);
  });
});
