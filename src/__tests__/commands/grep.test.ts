import { describe, it, expect } from 'vitest';
import { grepAsync } from '../../commands/grepAsync';
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
  fs.addFile(
    '/home/busykoala',
    'test.txt',
    'busykoala',
    'busygroup',
    'busykoala',
    'busygroup',
    'one\ntwo\nThree\nthree\n',
    'rw-r--r--',
  );
  fs.addFile(
    '/home/busykoala',
    'test2.txt',
    'busykoala',
    'busygroup',
    'busykoala',
    'busygroup',
    'alpha\nbeta\nThreefold\n',
    'rw-r--r--',
  );
  // pattern file for -f
  fs.addFile(
    '/home/busykoala',
    'pats.txt',
    'busykoala',
    'busygroup',
    'busykoala',
    'busygroup',
    'alpha\nbeta\n',
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

describe('grep', () => {
  it('finds matching lines', async () => {
    const io = createMockIO();
    const ctx = createMockContext();
    const code = await grepAsync(['three', 'test.txt'], ctx, io);
    expect(code).toBe(0);
    const out = (io as any)._stdout.join('');
    expect(out.trim().split('\n').length).toBe(1);
    expect(out).toContain('three');
  });

  it('returns 1 when no matches', async () => {
    const io = createMockIO();
    const ctx = createMockContext();
    const code = await grepAsync(['nomatch', 'test.txt'], ctx, io);
    expect(code).toBe(1);
  });

  it('handles -i flag (case-insensitive)', async () => {
    const io = createMockIO();
    const ctx = createMockContext();
    const code = await grepAsync(['-i', 'three', 'test.txt'], ctx, io);
    expect(code).toBe(0);
    const out = (io as any)._stdout.join('');
    expect(out).toContain('Three');
    expect(out).toContain('three');
  });

  it('prints counts with -c', async () => {
    const io = createMockIO();
    const ctx = createMockContext();
    const code = await grepAsync(['-c', 'three', 'test.txt'], ctx, io);
    expect(code).toBe(0);
    expect((io as any)._stdout.join('').trim()).toBe('1');
  });

  it('inverts with -v', async () => {
    const io = createMockIO();
    const ctx = createMockContext();
    const code = await grepAsync(['-v', 'one', 'test.txt'], ctx, io);
    expect(code).toBe(0);
    const out = (io as any)._stdout.join('');
    expect(out).not.toContain('one');
    expect(out).toContain('two');
  });

  it('shows line numbers with -n', async () => {
    const io = createMockIO();
    const ctx = createMockContext();
    const code = await grepAsync(['-n', 'two', 'test.txt'], ctx, io);
    expect(code).toBe(0);
    expect((io as any)._stdout.join('')).toMatch(/^2:/);
  });

  it('prints filenames when multiple files', async () => {
    const io = createMockIO();
    const ctx = createMockContext();
    const code = await grepAsync(['Three', 'test.txt', 'test2.txt'], ctx, io);
    expect(code).toBe(0);
    const out = (io as any)._stdout.join('');
    expect(out).toContain('test2.txt:Threefold');
  });

  it('suppresses filename with -h', async () => {
    const io = createMockIO();
    const ctx = createMockContext();
    const code = await grepAsync(['-h', 'Three', 'test2.txt'], ctx, io);
    expect(code).toBe(0);
    expect((io as any)._stdout.join('')).toBe('Threefold');
  });

  it('accepts patterns via -e', async () => {
    const io = createMockIO();
    const ctx = createMockContext();
    const code = await grepAsync(['-e', 'alpha', '-e', 'beta', 'test2.txt'], ctx, io);
    expect(code).toBe(0);
    const out = (io as any)._stdout.join('');
    expect(out).toContain('alpha');
    expect(out).toContain('beta');
  });

  it('shows help with --help', async () => {
    const io = createMockIO();
    const ctx = createMockContext();
    const code = await grepAsync(['--help'], ctx, io);
    expect(code).toBe(0);
    expect((io as any)._stdout.join('').toLowerCase()).toContain('grep');
  });

  it('matches whole words with -w', async () => {
    const io = createMockIO() as any;
    const ctx = createMockContext();
    const code = await grepAsync(['-w', 'Three', 'test.txt', 'test2.txt'], ctx, io);
    expect(code).toBe(0);
    const out = io._stdout.join('');
    expect(out).toContain('test.txt:Three');
    expect(out).not.toContain('Threefold');
  });

  it('matches whole lines with -x', async () => {
    const io = createMockIO() as any;
    const ctx = createMockContext();
    const code = await grepAsync(['-x', 'three', 'test.txt'], ctx, io);
    expect(code).toBe(0);
    expect(io._stdout.join('').trim()).toBe('three');
  });

  it('lists files with matches using -l and without using -L', async () => {
    const io1 = createMockIO() as any;
    const ctx1 = createMockContext();
    const c1 = await grepAsync(['-l', 'alpha', 'test.txt', 'test2.txt'], ctx1, io1);
    expect(c1).toBe(0);
    expect(io1._stdout.join('').trim()).toBe('test2.txt');

    const io2 = createMockIO() as any;
    const ctx2 = createMockContext();
    const c2 = await grepAsync(['-L', 'alpha', 'test.txt', 'test2.txt'], ctx2, io2);
    expect(c2).toBe(0);
    expect(io2._stdout.join('').trim()).toBe('test.txt');
  });

  it('respects max count with -m', async () => {
    const io = createMockIO() as any;
    const ctx = createMockContext();
    const code = await grepAsync(['-m', '1', 'three', 'test.txt'], ctx, io);
    expect(code).toBe(0);
    const lines = io._stdout.join('').split('\n').filter(Boolean);
    expect(lines.length).toBe(1);
  });

  it('prints context with -A/-B/-C', async () => {
    const ioA = createMockIO() as any;
    const ctxA = createMockContext();
    await grepAsync(['-A', '1', 'two', 'test.txt'], ctxA, ioA);
    const outA = ioA._stdout.join('');
    expect(outA).toContain('two');
    expect(outA).toContain('Three'); // after context

    const ioB = createMockIO() as any;
    const ctxB = createMockContext();
    await grepAsync(['-B', '1', 'two', 'test.txt'], ctxB, ioB);
    const outB = ioB._stdout.join('');
    expect(outB).toContain('one'); // before context
    expect(outB).toContain('two');

    const ioC = createMockIO() as any;
    const ctxC = createMockContext();
    await grepAsync(['-C', '1', 'Three', 'test.txt'], ctxC, ioC);
    const outC = ioC._stdout.join('');
    expect(outC).toContain('two');
    expect(outC).toContain('Three');
    expect(outC).toContain('three');
  });

  it('treats patterns as fixed strings with -F', async () => {
    const io = createMockIO() as any;
    const ctx = createMockContext();
    const code = await grepAsync(['-F', 'T.*d', 'test2.txt'], ctx, io);
    expect(code).toBe(1);
  });

  it('loads patterns from a file with -f', async () => {
    const io = createMockIO() as any;
    const ctx = createMockContext();
    const code = await grepAsync(['-f', 'pats.txt', 'test2.txt'], ctx, io);
    expect(code).toBe(0);
    const out = io._stdout.join('');
    expect(out).toContain('alpha');
    expect(out).toContain('beta');
  });

  it('highlights with --color', async () => {
    const io = createMockIO() as any;
    const ctx = createMockContext();
    const code = await grepAsync(['--color', '-i', 'three', 'test.txt'], ctx, io);
    expect(code).toBe(0);
    expect(io._stdout.join('')).toContain('grep-match');
  });

  it('shows version with --version', async () => {
    const io = createMockIO() as any;
    const ctx = createMockContext();
    const code = await grepAsync(['--version'], ctx, io);
    expect(code).toBe(0);
    expect(io._stdout.join('')).toMatch(/GNU coreutils simulation/i);
  });
});
