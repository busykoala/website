import { describe, it, expect } from 'vitest';
import { pwdAsync } from '../../commands/pwdAsync';
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

function createMockContext(pwd = '/home/busykoala'): CommandContext {
  const fs = new FileSystem();
  addBaseFilesystem(fs);
  return {
    env: {
      PWD: pwd,
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

describe('pwd', () => {
  it('prints current directory', async () => {
    const io = createMockIO();
    const ctx = createMockContext();
    const code = await pwdAsync([], ctx, io);
    expect(code).toBe(0);
    expect((io as any)._stdout.join('')).toBe('/home/busykoala');
  });

  it('supports -L and -P modes', async () => {
    const ioL = createMockIO();
    const ctxL = createMockContext('/home/busykoala/../busykoala');
    let code = await pwdAsync(['-L'], ctxL, ioL);
    expect(code).toBe(0);
    expect((ioL as any)._stdout.join('')).toBe('/home/busykoala/../busykoala');

    const ioP = createMockIO();
    const ctxP = createMockContext('/home/busykoala/../busykoala');
    code = await pwdAsync(['-P'], ctxP, ioP);
    expect(code).toBe(0);
    expect((ioP as any)._stdout.join('')).toBe('/home/busykoala');
  });

  it('shows help and version', async () => {
    const ioH = createMockIO();
    const ctxH = createMockContext();
    let code = await pwdAsync(['--help'], ctxH, ioH);
    expect(code).toBe(0);
    expect((ioH as any)._stdout.join('').toLowerCase()).toContain('pwd');

    const ioV = createMockIO();
    const ctxV = createMockContext();
    code = await pwdAsync(['--version'], ctxV, ioV);
    expect(code).toBe(0);
    expect((ioV as any)._stdout.join('')).toMatch(
      /GNU coreutils simulation|pwd \(GNU coreutils simulation\)/i,
    );
  });
});
