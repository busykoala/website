import { describe, it, expect } from 'vitest';
import { mkdirAsync } from '../../commands/mkdirAsync';
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

describe('mkdir', () => {
  it('creates a directory', async () => {
    const c = ctx();
    const fs = c.terminal.getFileSystem();
    const streams = io();
    const code = await mkdirAsync(['newdir'], c, streams);
    expect(code).toBe(0);
    const node = fs.getNode('/home/busykoala/newdir', 'busykoala', 'busygroup');
    expect(node && node.type === 'directory').toBe(true);
  });

  it('errors on missing operand', async () => {
    const c = ctx();
    const streams = io();
    const code = await mkdirAsync([], c, streams);
    expect(code).toBe(1);
    expect((streams as any)._stderr.join('')).toContain('missing operand');
  });

  it('shows help', async () => {
    const c = ctx();
    const streams = io();
    const code = await mkdirAsync(['--help'], c, streams);
    expect(code).toBe(0);
    expect((streams as any)._stdout.join('').toLowerCase()).toContain('mkdir');
  });

  it('creates parent directories with -p', async () => {
    const c = ctx();
    const fs = c.terminal.getFileSystem();
    const streams = io();
    const code = await mkdirAsync(['-p', 'a/b/c'], c, streams);
    expect(code).toBe(0);
    expect(fs.getNode('/home/busykoala/a', 'busykoala', 'busygroup')).toBeTruthy();
    expect(fs.getNode('/home/busykoala/a/b', 'busykoala', 'busygroup')).toBeTruthy();
    expect(fs.getNode('/home/busykoala/a/b/c', 'busykoala', 'busygroup')).toBeTruthy();
  });

  it('prints verbose messages with -v', async () => {
    const c = ctx();
    const streams = io();
    const code = await mkdirAsync(['-v', 'ver'], c, streams);
    expect(code).toBe(0);
    expect((streams as any)._stdout.join('')).toMatch(/created directory/);
  });

  it('sets permissions with -m', async () => {
    const c = ctx();
    const fs = c.terminal.getFileSystem();
    const streams = io();
    const code = await mkdirAsync(['-m', '700', 'permtest'], c, streams);
    expect(code).toBe(0);
    const node = fs.getNode('/home/busykoala/permtest', 'busykoala', 'busygroup') as any;
    expect(node.permissions).toBe('rwx------');
  });

  it('supports multiple directories in one call', async () => {
    const c = ctx();
    const fs = c.terminal.getFileSystem();
    const streams = io();
    const code = await mkdirAsync(['one', 'two'], c, streams);
    expect(code).toBe(0);
    expect(fs.getNode('/home/busykoala/one', 'busykoala', 'busygroup')).toBeTruthy();
    expect(fs.getNode('/home/busykoala/two', 'busykoala', 'busygroup')).toBeTruthy();
  });

  it('shows version with --version', async () => {
    const c = ctx();
    const streams = io();
    const code = await mkdirAsync(['--version'], c, streams);
    expect(code).toBe(0);
    expect((streams as any)._stdout.join('')).toMatch(
      /GNU coreutils simulation|mkdir \(GNU coreutils simulation\)/i,
    );
  });
});
