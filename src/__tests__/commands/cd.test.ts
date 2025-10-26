import { describe, it, expect } from 'vitest';
import { cdAsync } from '../../commands/cdAsync';
import type { CommandContext } from '../../core/TerminalCore';
import type { IOStreams } from '../../core/streams';
import { FileSystem } from '../../core/filesystem';
import { addBaseFilesystem } from '../../core/addBaseFilesystem';

function createMockIO(): IOStreams {
  const stdout: string[] = [];
  const stderr: string[] = [];
  return {
    stdout: { write: (d: string) => stdout.push(d), on: () => {} } as any,
    stderr: { write: (d: string) => stderr.push(d), on: () => {} } as any,
    stdin: { read: () => '', on: () => {} } as any,
    _stdout: stdout,
    _stderr: stderr,
  } as any;
}

function createMockContext(): CommandContext {
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

describe('cd', () => {
  it('changes directory', async () => {
    const io = createMockIO();
    const ctx = createMockContext();
    const code = await cdAsync(['about'], ctx, io);
    expect(code).toBe(0);
    expect(ctx.env.PWD).toBe('/home/busykoala/about');
  });

  it('handles non-existent directory', async () => {
    const io = createMockIO();
    const ctx = createMockContext();
    const code = await cdAsync(['nonexistent'], ctx, io);
    expect(code).toBe(1);
    expect((io as any)._stderr.length).toBeGreaterThan(0);
  });

  it('goes to HOME when no args', async () => {
    const io = createMockIO();
    const ctx = createMockContext();
    ctx.env.PWD = '/home/busykoala/about';
    const code = await cdAsync([], ctx, io);
    expect(code).toBe(0);
    expect(ctx.env.PWD).toBe('/home/busykoala');
  });

  it('shows help and version', async () => {
    const io = createMockIO();
    const ctx = createMockContext();
    let code = await cdAsync(['--help'], ctx, io);
    expect(code).toBe(0);
    expect((io as any)._stdout.join('').toLowerCase()).toContain('cd');
    (io as any)._stdout.length = 0;
    code = await cdAsync(['--version'], ctx, io);
    expect(code).toBe(0);
    expect((io as any)._stdout.join('')).toMatch(
      /GNU coreutils simulation|cd \(GNU coreutils simulation\)/i,
    );
  });

  it('supports cd - toggling to OLDPWD and prints it', async () => {
    const io = createMockIO();
    const ctx = createMockContext();
    // Move somewhere first
    let code = await cdAsync(['about'], ctx, io);
    expect(code).toBe(0);
    expect(ctx.env.OLDPWD).toBe('/home/busykoala');
    (io as any)._stdout.length = 0;
    code = await cdAsync(['-'], ctx, io);
    expect(code).toBe(0);
    expect(ctx.env.PWD).toBe('/home/busykoala');
    // printed path
    expect((io as any)._stdout.join('')).toBe('/home/busykoala');
  });

  it('errors when OLDPWD not set for cd -', async () => {
    const io = createMockIO();
    const ctx = createMockContext();
    delete (ctx.env as any).OLDPWD;
    const code = await cdAsync(['-'], ctx, io);
    expect(code).toBe(1);
    expect((io as any)._stderr.join('')).toMatch(/OLDPWD not set/);
  });

  it('CDPATH resolves relative dirs and prints when not current PWD base', async () => {
    const io = createMockIO();
    const ctx = createMockContext();
    const fs = ctx.terminal.getFileSystem();
    // Create a project dir under a CDPATH entry different from current PWD
    // Use existing '/home/busykoala/about' as base to avoid permission issues
    fs.addDirectory(
      '/home/busykoala/about',
      'proj',
      'busykoala',
      'busygroup',
      'busykoala',
      'busygroup',
    );
    ctx.env.CDPATH = '/home/busykoala/about';
    const code = await cdAsync(['proj'], ctx, io);
    expect(code).toBe(0);
    expect(ctx.env.PWD).toBe('/home/busykoala/about/proj');
    // When from CDPATH base not equal to current PWD, path should be printed
    expect((io as any)._stdout.join('')).toBe('/home/busykoala/about/proj');
  });

  it('~ and ~user expansion works', async () => {
    const io = createMockIO();
    const ctx = createMockContext();
    let code = await cdAsync(['~'], ctx, io);
    expect(code).toBe(0);
    expect(ctx.env.PWD).toBe('/home/busykoala');
    code = await cdAsync(['~busykoala'], ctx, io);
    expect(code).toBe(0);
    expect(ctx.env.PWD).toBe('/home/busykoala');
    code = await cdAsync(['~/about'], ctx, io);
    // '~/about' resolves to /home/busykoala/about
    expect(code).toBe(0);
    expect(ctx.env.PWD).toBe('/home/busykoala/about');
  });

  it('supports -L and -P modes for PWD update', async () => {
    const io = createMockIO();
    const ctx = createMockContext();
    const fs = ctx.terminal.getFileSystem();
    // Make a nested path that normalizes
    fs.addDirectory('/home/busykoala', 'x', 'busykoala', 'busygroup', 'busykoala', 'busygroup');
    ctx.env.PWD = '/home/busykoala/x';
    let code = await cdAsync(['-L', '../about'], ctx, io);
    expect(code).toBe(0);
    // -L keeps logical (../)
    expect(ctx.env.PWD.endsWith('../about')).toBe(true);

    // Now physical -P normalizes
    code = await cdAsync(['-P', '..'], ctx, io);
    expect(code).toBe(0);
    expect(ctx.env.PWD).toBe('/home/busykoala');
  });

  it('errors on too many args and when HOME missing', async () => {
    const io = createMockIO();
    const ctx = createMockContext();
    let code = await cdAsync(['a', 'b'], ctx, io);
    expect(code).toBe(1);
    expect((io as any)._stderr.join('')).toMatch(/too many arguments/);
    const ctx2 = createMockContext();
    (ctx2.env as any).HOME = '';
    code = await cdAsync([], ctx2, io);
    expect(code).toBe(1);
    expect((io as any)._stderr.join('')).toMatch(/HOME not set/);
  });
});
