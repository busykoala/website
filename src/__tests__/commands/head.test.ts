import { describe, it, expect } from 'vitest';
import { headAsync } from '../../commands/headAsync';
import type { CommandContext } from '../../core/TerminalCore';
import type { IOStreams } from '../../core/streams';
import { FileSystem } from '../../core/filesystem';
import { addBaseFilesystem } from '../../core/addBaseFilesystem';

function createMockIO(): IOStreams & {
  _stdout: string[];
  _stderr: string[];
  setStdin: (s: string) => void;
} {
  const stdout: string[] = [];
  const stderr: string[] = [];
  let stdinData = '';
  return {
    stdout: { write: (d: string) => stdout.push(d), on: () => {} } as any,
    stderr: { write: (d: string) => stderr.push(d), on: () => {} } as any,
    stdin: {
      read: () => {
        const d = stdinData;
        stdinData = '';
        return d;
      },
      on: () => {},
    } as any,
    _stdout: stdout,
    _stderr: stderr,
    setStdin: (s: string) => {
      stdinData = s;
    },
  } as any;
}

function createMockContext(): CommandContext {
  const fs = new FileSystem();
  addBaseFilesystem(fs);
  fs.addFile(
    '/home/busykoala',
    'f1.txt',
    'busykoala',
    'busygroup',
    'busykoala',
    'busygroup',
    'aaaa\nbbbb\ncccc\n',
    'rw-r--r--',
  );
  fs.addFile(
    '/home/busykoala',
    'f2.txt',
    'busykoala',
    'busygroup',
    'busykoala',
    'busygroup',
    '111122223333',
    'rw-r--r--',
  );
  fs.addFile(
    '/home/busykoala',
    'many.txt',
    'busykoala',
    'busygroup',
    'busykoala',
    'busygroup',
    'x1\nx2\nx3\nx4\nx5\nx6\n',
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

describe('head', () => {
  it('prints first bytes with -c', async () => {
    const io = createMockIO();
    const ctx = createMockContext();
    const code = await headAsync(['-c', '4', 'f2.txt'], ctx, io);
    expect(code).toBe(0);
    expect((io as any)._stdout.join('')).toBe('1111');
  });

  it('prints headers for multiple files unless -q', async () => {
    const io = createMockIO();
    const ctx = createMockContext();
    const code = await headAsync(['-n', '1', 'f1.txt', 'f2.txt'], ctx, io);
    expect(code).toBe(0);
    const out = (io as any)._stdout.join('');
    expect(out).toContain('==> f1.txt <==');
    expect(out).toContain('==> f2.txt <==');
  });

  it('reads from stdin when no files given', async () => {
    const io = createMockIO();
    const ctx = createMockContext();
    io.setStdin('x\ny\nz\n');
    const code = await headAsync(['-n', '2'], ctx, io);
    expect(code).toBe(0);
    expect((io as any)._stdout.join('')).toBe('x\ny');
  });

  it('suppresses headers with -q for multiple files', async () => {
    const io = createMockIO();
    const ctx = createMockContext();
    const code = await headAsync(['-q', '-n', '1', 'f1.txt', 'f2.txt'], ctx, io);
    expect(code).toBe(0);
    const out = (io as any)._stdout.join('');
    expect(out).not.toContain('==>');
  });

  it('forces headers with -v even for single file', async () => {
    const io = createMockIO();
    const ctx = createMockContext();
    const code = await headAsync(['-v', '-n', '1', 'f1.txt'], ctx, io);
    expect(code).toBe(0);
    const out = (io as any)._stdout.join('');
    expect(out).toContain('==> f1.txt <==');
  });

  it('supports --bytes= form', async () => {
    const io = createMockIO();
    const ctx = createMockContext();
    const code = await headAsync(['--bytes=6', 'f2.txt'], ctx, io);
    expect(code).toBe(0);
    expect((io as any)._stdout.join('')).toBe('111122');
  });

  it('handles negative -n to drop last lines', async () => {
    const io = createMockIO();
    const ctx = createMockContext();
    const code = await headAsync(['-n', '-2', 'many.txt'], ctx, io);
    expect(code).toBe(0);
    const out = (io as any)._stdout.join('');
    expect(out).toContain('x1\nx2\nx3\nx4');
    expect(out).not.toContain('x5');
    expect(out).not.toContain('x6');
  });

  it('supports shorthand numeric form like -2', async () => {
    const io = createMockIO();
    const ctx = createMockContext();
    const code = await headAsync(['-2', 'f1.txt'], ctx, io);
    expect(code).toBe(0);
    const out = (io as any)._stdout.join('');
    expect(out).toBe('aaaa\nbbbb');
  });

  it('reads from explicit - (stdin)', async () => {
    const io = createMockIO();
    const ctx = createMockContext();
    io.setStdin('alpha\nbeta\n');
    const code = await headAsync(['-n', '1', '-'], ctx, io);
    expect(code).toBe(0);
    expect((io as any)._stdout.join('')).toBe('alpha');
  });

  it('prints --help and --version', async () => {
    const ioH = createMockIO();
    const ctxH = createMockContext();
    const codeH = await headAsync(['--help'], ctxH, ioH);
    expect(codeH).toBe(0);
    expect((ioH as any)._stdout.join('')).toMatch(/head/i);

    const ioV = createMockIO();
    const ctxV = createMockContext();
    const codeV = await headAsync(['--version'], ctxV, ioV);
    expect(codeV).toBe(0);
    expect((ioV as any)._stdout.join('')).toMatch(/GNU coreutils simulation/i);
  });
});
