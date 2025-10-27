import { describe, it, expect } from 'vitest';
import { catAsync } from '../../commands/catAsync';
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
    'a.txt',
    'busykoala',
    'busygroup',
    'busykoala',
    'busygroup',
    'A\n\tTab\n',
    'rw-r--r--',
  );
  fs.addFile(
    '/home/busykoala',
    'b.txt',
    'busykoala',
    'busygroup',
    'busykoala',
    'busygroup',
    'B\n',
    'rw-r--r--',
  );
  fs.addFile(
    '/home/busykoala',
    'blank.txt',
    'busykoala',
    'busygroup',
    'busykoala',
    'busygroup',
    'x\n\n\ny\n',
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

describe('cat', () => {
  it('shows all with -A', async () => {
    const io = createMockIO();
    const ctx = createMockContext();
    const code = await catAsync(['-A', 'a.txt'], ctx, io);
    expect(code).toBe(0);
    const out = (io as any)._stdout.join('');
    expect(out).toContain('^I');
    expect(out).toContain('$');
  });

  it('concatenates multiple files', async () => {
    const io = createMockIO();
    const ctx = createMockContext();
    const code = await catAsync(['a.txt', 'b.txt'], ctx, io);
    expect(code).toBe(0);
    const out = (io as any)._stdout.join('');
    expect(out.startsWith('A')).toBe(true);
    expect(out.trimEnd().endsWith('B')).toBe(true);
  });

  it('reads from stdin when file is -', async () => {
    const io = createMockIO();
    const ctx = createMockContext();
    io.setStdin('from-stdin\n');
    const code = await catAsync(['-'], ctx, io);
    expect(code).toBe(0);
    expect((io as any)._stdout.join('')).toBe('from-stdin\n');
  });

  it('numbers nonblank with -b and overrides -n', async () => {
    const io = createMockIO();
    const ctx = createMockContext();
    const code = await catAsync(['-bn', 'blank.txt'], ctx, io);
    expect(code).toBe(0);
    const out = (io as any)._stdout.join('');
    const lines = out.split('\n');
    expect(lines[0]).toMatch(/^\s*1\t/);
    // blank line should not be numbered
    expect(lines[1]).toBe('');
  });

  it('shows ends with -E', async () => {
    const io = createMockIO();
    const ctx = createMockContext();
    const code = await catAsync(['-E', 'a.txt'], ctx, io);
    expect(code).toBe(0);
    const out = (io as any)._stdout.join('');
    expect(out).toContain('A$');
    expect(out).toContain('\tTab$');
  });

  it('shows tabs with -T', async () => {
    const io = createMockIO();
    const ctx = createMockContext();
    const code = await catAsync(['-T', 'a.txt'], ctx, io);
    expect(code).toBe(0);
    const out = (io as any)._stdout.join('');
    expect(out).toContain('^I');
    expect(out).not.toContain('$');
  });

  it('prints --help and --version', async () => {
    const ioH = createMockIO();
    const ctxH = createMockContext();
    const codeH = await catAsync(['--help'], ctxH, ioH);
    expect(codeH).toBe(0);
    expect((ioH as any)._stdout.join('')).toMatch(/cat/i);

    const ioV = createMockIO();
    const ctxV = createMockContext();
    const codeV = await catAsync(['--version'], ctxV, ioV);
    expect(codeV).toBe(0);
    expect((ioV as any)._stdout.join('')).toMatch(/GNU coreutils simulation/i);
  });

  it('reads from stdin when no files are given', async () => {
    const io = createMockIO();
    const ctx = createMockContext();
    io.setStdin('stdin-data\n');
    const code = await catAsync([], ctx, io);
    expect(code).toBe(0);
    expect((io as any)._stdout.join('')).toBe('stdin-data\n');
  });
});
