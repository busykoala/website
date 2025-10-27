import { describe, it, expect } from 'vitest';
import { tailAsync } from '../../commands/tailAsync';
import type { CommandContext } from '../../core/TerminalCore';
import type { IOStreams } from '../../core/streams';
import { FileSystem } from '../../core/filesystem';
import { addBaseFilesystem } from '../../core/addBaseFilesystem';

function createMockIO(): IOStreams & {
  setStdin: (s: string) => void;
  _stdout: string[];
  _stderr: string[];
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
    'test.txt',
    'busykoala',
    'busygroup',
    'busykoala',
    'busygroup',
    'line1\nline2\nline3\nline4\nline5\nline6\nline7\nline8\nline9\nline10\nline11\nline12',
    'rw-r--r--',
  );
  fs.addFile(
    '/home/busykoala',
    'abc.txt',
    'busykoala',
    'busygroup',
    'busykoala',
    'busygroup',
    'abcdef',
    'rw-r--r--',
  );
  fs.addFile(
    '/home/busykoala',
    'xyz.txt',
    'busykoala',
    'busygroup',
    'busykoala',
    'busygroup',
    'xyz123',
    'rw-r--r--',
  );
  fs.addFile(
    '/home/busykoala',
    'follow.txt',
    'busykoala',
    'busygroup',
    'busykoala',
    'busygroup',
    'a\n',
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

describe('tail', () => {
  it('shows last 10 lines by default', async () => {
    const io = createMockIO();
    const ctx = createMockContext();
    const code = await tailAsync(['test.txt'], ctx, io);
    expect(code).toBe(0);
    const out = (io as any)._stdout.join('');
    expect(out).toContain('line12');
    expect(out).toContain('line3');
    expect(out).not.toContain('line2');
  });

  it('handles -n flag', async () => {
    const io = createMockIO();
    const ctx = createMockContext();
    const code = await tailAsync(['-n', '3', 'test.txt'], ctx, io);
    expect(code).toBe(0);
    const out = (io as any)._stdout.join('');
    expect(out).toContain('line10');
    expect(out).toContain('line12');
    expect(out).not.toContain('line9');
  });

  it('supports +NUM start notation', async () => {
    const io = createMockIO();
    const ctx = createMockContext();
    const code = await tailAsync(['+11', 'test.txt'], ctx, io);
    expect(code).toBe(0);
    expect((io as any)._stdout.join('')).toBe('line11\nline12');
  });

  it('handles -c bytes', async () => {
    const io = createMockIO();
    const ctx = createMockContext();
    const code = await tailAsync(['-c', '3', 'abc.txt'], ctx, io);
    expect(code).toBe(0);
    expect((io as any)._stdout.join('')).toBe('def');
  });

  it('handles -c +NUM bytes start', async () => {
    const io = createMockIO();
    const ctx = createMockContext();
    const code = await tailAsync(['-c', '+4', 'xyz.txt'], ctx, io);
    expect(code).toBe(0);
    expect((io as any)._stdout.join('')).toBe('123');
  });

  it('prints headers for multiple files unless -q', async () => {
    const io = createMockIO();
    const ctx = createMockContext();
    const code = await tailAsync(['-n', '1', 'abc.txt', 'xyz.txt'], ctx, io);
    expect(code).toBe(0);
    const out = (io as any)._stdout.join('');
    expect(out).toContain('==> abc.txt <==');
    expect(out).toContain('==> xyz.txt <==');
  });

  it('suppresses headers with -q', async () => {
    const io = createMockIO();
    const ctx = createMockContext();
    const code = await tailAsync(['-q', '-n', '1', 'abc.txt', 'xyz.txt'], ctx, io);
    expect(code).toBe(0);
    const out = (io as any)._stdout.join('');
    expect(out).not.toContain('==>');
  });

  it('reads from stdin with -', async () => {
    const io = createMockIO();
    const ctx = createMockContext();
    io.setStdin('a\nb\nc\n');
    const code = await tailAsync(['-n', '2', '-'], ctx, io);
    expect(code).toBe(0);
    expect((io as any)._stdout.join('')).toBe('b\nc');
  });

  it('reads from stdin when no files are given', async () => {
    const io = createMockIO();
    const ctx = createMockContext();
    io.setStdin('a\nb\nc\n');
    const code = await tailAsync(['-n', '2'], ctx, io);
    expect(code).toBe(0);
    expect((io as any)._stdout.join('')).toBe('b\nc');
  });

  it('shows help with --help', async () => {
    const io = createMockIO();
    const ctx = createMockContext();
    const code = await tailAsync(['--help'], ctx, io);
    expect(code).toBe(0);
    expect((io as any)._stdout.join('').toLowerCase()).toContain('tail');
  });

  it('forces headers with -v for single file', async () => {
    const io = createMockIO();
    const ctx = createMockContext();
    const code = await tailAsync(['-v', '-n', '1', 'abc.txt'], ctx, io);
    expect(code).toBe(0);
    const out = (io as any)._stdout.join('');
    expect(out).toContain('==> abc.txt <==');
  });

  it('shows version with --version', async () => {
    const io = createMockIO();
    const ctx = createMockContext();
    const code = await tailAsync(['--version'], ctx, io);
    expect(code).toBe(0);
    expect((io as any)._stdout.join('')).toMatch(/GNU coreutils simulation/i);
  });

  it('follows appended data with -f', async () => {
    const io = createMockIO();
    const ctx = createMockContext();
    // Bound the polling loop to two iterations
    (ctx.env as any).TAIL_MAX_POLL = '2';
    const fs = ctx.terminal.getFileSystem();

    const prom = tailAsync(['-f', '-s', '0.02', '-n', '1', 'follow.txt'], ctx, io);

    // Schedule append before the second poll tick
    await new Promise((res) => setTimeout(res, 5));
    const node = fs.getNode('/home/busykoala/follow.txt', 'busykoala', 'busygroup', 'read') as any;
    node.content = (node.content || '') + 'b\n';

    const code = await prom;
    expect(code).toBe(0);
    const out = (io as any)._stdout.join('');
    expect(out).toContain('a');
    expect(out).toContain('b\n');
  });
});
