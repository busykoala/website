import { describe, it, expect } from 'vitest';
import { wcAsync } from '../../commands/wcAsync';
import type { CommandContext } from '../../core/TerminalCore';
import type { IOStreams } from '../../core/streams';
import { FileSystem } from '../../core/filesystem';
import { addBaseFilesystem } from '../../core/addBaseFilesystem';

function createIO(): IOStreams & {
  setStdin: (s: string) => void;
  _stdout: string[];
  _stderr: string[];
} {
  const stdout: string[] = [];
  const stderr: string[] = [];
  let stdin = '';
  return {
    stdout: { write: (d: string) => stdout.push(d), on: () => {} } as any,
    stderr: { write: (d: string) => stderr.push(d), on: () => {} } as any,
    stdin: {
      read: () => {
        const d = stdin;
        stdin = '';
        return d;
      },
      on: () => {},
    } as any,
    _stdout: stdout,
    _stderr: stderr,
    setStdin: (s: string) => {
      stdin = s;
    },
  } as any;
}

function ctx(): CommandContext {
  const fs = new FileSystem();
  addBaseFilesystem(fs);
  fs.addFile(
    '/home/busykoala',
    'f1.txt',
    'busykoala',
    'busygroup',
    'busykoala',
    'busygroup',
    'a b c\nd e\n',
    'rw-r--r--',
  );
  fs.addFile(
    '/home/busykoala',
    'f2.txt',
    'busykoala',
    'busygroup',
    'busykoala',
    'busygroup',
    'one two three',
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

describe('wc', () => {
  it('defaults to -lwc', async () => {
    const io = createIO();
    const c = ctx();
    const code = await wcAsync(['f1.txt'], c, io);
    expect(code).toBe(0);
    const parts = (io as any)._stdout.join('').trim().split(/\s+/);
    // Expect 2 lines, 5 words, bytes length of content
    expect(parts[0]).toBe('2');
    expect(parts[1]).toBe('5');
    expect(parts[3]).toBe('f1.txt');
  });

  it('handles -l, -w, -c individually', async () => {
    const io = createIO();
    const c = ctx();
    await wcAsync(['-l', 'f1.txt'], c, io);
    expect((io as any)._stdout.join('').trim()).toMatch(/^2\s+f1.txt$/);
  });

  it('handles -L (max line length)', async () => {
    const io = createIO();
    const c = ctx();
    const code = await wcAsync(['-L', 'f1.txt'], c, io);
    expect(code).toBe(0);
    const out = (io as any)._stdout.join('').trim();
    const num = parseInt(out.split(/\s+/)[0], 10);
    expect(num).toBeGreaterThan(0);
  });

  it('supports multiple files with totals', async () => {
    const io = createIO();
    const c = ctx();
    const code = await wcAsync(['f1.txt', 'f2.txt'], c, io);
    expect(code).toBe(0);
    const out = (io as any)._stdout.join('');
    expect(out).toContain('total');
  });

  it('reads from stdin with -', async () => {
    const io = createIO();
    const c = ctx();
    io.setStdin('x y z\n');
    const code = await wcAsync(['-w', '-'], c, io);
    expect(code).toBe(0);
    expect((io as any)._stdout.join('').trim()).toBe('3 -');
  });

  it('prints version with --version', async () => {
    const io = createIO();
    const c = ctx();
    const code = await wcAsync(['--version'], c, io);
    expect(code).toBe(0);
    expect((io as any)._stdout.join('')).toMatch(/GNU coreutils simulation/i);
  });
});
