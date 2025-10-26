import { describe, it, expect } from 'vitest';
import { chmodAsync } from '../../commands/chmodAsync';
import { FileSystem } from '../../core/filesystem';
import { addBaseFilesystem } from '../../core/addBaseFilesystem';
import type { CommandContext } from '../../core/TerminalCore';
import type { IOStreams } from '../../core/streams';

function createMockIO(): IOStreams {
  const stdout: string[] = [];
  const stderr: string[] = [];
  return {
    stdout: { write: (data: string) => stdout.push(data), on: () => {} },
    stderr: { write: (data: string) => stderr.push(data), on: () => {} },
    stdin: { read: () => '', on: () => {} },
    _stdout: stdout as any,
    _stderr: stderr as any,
  } as any;
}

function createMockContext(): CommandContext {
  const fs = new FileSystem();
  addBaseFilesystem(fs);

  // create some files and dirs for tests
  fs.addDirectory('/home', 'busykoala', 'root', 'root', 'busykoala', 'busygroup');
  fs.addFile(
    '/home/busykoala',
    'file1.txt',
    'busykoala',
    'busygroup',
    'busykoala',
    'busygroup',
    'hello',
    'rw-r--r--',
  );
  fs.addDirectory('/home/busykoala', 'subdir', 'busykoala', 'busygroup', 'busykoala', 'busygroup');
  fs.addFile(
    '/home/busykoala/subdir',
    'inner.txt',
    'busykoala',
    'busygroup',
    'busykoala',
    'busygroup',
    'inner',
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

describe('chmodAsync tests', () => {
  it('applies octal mode (644) to a file', async () => {
    const io = createMockIO();
    const ctx = createMockContext();

    const code = await chmodAsync(['644', 'file1.txt'], ctx, io);
    expect(code).toBe(0);

    const node = ctx.terminal
      .getFileSystem()
      .getNode('/home/busykoala/file1.txt', ctx.env.USER, 'busygroup');
    expect(node).not.toBeNull();
    expect((node as any).permissions).toBe('rw-r--r--'); // 644
  });

  it('applies symbolic +x to user', async () => {
    const io = createMockIO();
    const ctx = createMockContext();

    // remove execute if present then add
    const fs = ctx.terminal.getFileSystem();
    const nodeBefore = fs.getNode('/home/busykoala/file1.txt', ctx.env.USER, 'busygroup') as any;
    nodeBefore.permissions = 'rw-r--r--';

    const code = await chmodAsync(['u+x', 'file1.txt'], ctx, io);
    expect(code).toBe(0);

    const node = fs.getNode('/home/busykoala/file1.txt', ctx.env.USER, 'busygroup') as any;
    expect(node.permissions[2]).toBe('x'); // user execute bit
  });

  it('recurses with -R and changes children', async () => {
    const io = createMockIO();
    const ctx = createMockContext();
    const fs = ctx.terminal.getFileSystem();

    const code = await chmodAsync(['-R', '755', 'subdir'], ctx, io);
    expect(code).toBe(0);

    const child = fs.getNode('/home/busykoala/subdir/inner.txt', ctx.env.USER, 'busygroup') as any;
    expect(child).not.toBeNull();
    expect(child.permissions).toBe('rwxr-xr-x'); // 755
  });

  it('force -f suppresses errors for missing files', async () => {
    const io = createMockIO();
    const ctx = createMockContext();

    const code = await chmodAsync(['-f', '644', 'no-such.file'], ctx, io);
    expect(code).toBe(0);
    // stderr should be empty
    expect((io as any)._stderr.length).toBe(0);
  });

  it('verbose -v prints change messages', async () => {
    const io = createMockIO();
    const ctx = createMockContext();

    const code = await chmodAsync(['-v', '700', 'file1.txt'], ctx, io);
    expect(code).toBe(0);
    const out = (io as any)._stdout.join('');
    expect(out).toContain("mode of 'file1.txt' changed");
  });

  it('changes-only -c prints only when a change occurs', async () => {
    const io = createMockIO();
    const ctx = createMockContext();
    const fs = ctx.terminal.getFileSystem();

    // Initially 644, applying 644 with -c should produce no output
    let code = await chmodAsync(['-c', '644', 'file1.txt'], ctx, io);
    expect(code).toBe(0);
    expect((io as any)._stdout.join('')).toBe('');

    // Applying 600 should change and print
    (io as any)._stdout.length = 0;
    code = await chmodAsync(['-c', '600', 'file1.txt'], ctx, io);
    expect(code).toBe(0);
    const out = (io as any)._stdout.join('');
    expect(out).toContain("mode of 'file1.txt' changed");
    const node = fs.getNode('/home/busykoala/file1.txt', ctx.env.USER, 'busygroup') as any;
    expect(node.permissions).toBe('rw-------');
  });

  it('prints version with --version', async () => {
    const io = createMockIO();
    const ctx = createMockContext();
    const code = await chmodAsync(['--version', '644', 'file1.txt'], ctx, io);
    expect(code).toBe(0);
    expect((io as any)._stdout.join('')).toMatch(
      /GNU coreutils simulation|chmod \(GNU coreutils simulation\)/i,
    );
  });
});
