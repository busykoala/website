import { describe, it, expect } from 'vitest';
import { chownAsync } from '../../commands/chownAsync';
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

  // setup directory and files
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

describe('chownAsync tests', () => {
  it('changes owner only (owner:)', async () => {
    const io = createMockIO();
    const ctx = createMockContext();

    const code = await chownAsync(['root:', 'file1.txt'], ctx, io);
    // some implementations accept 'root:' to mean owner with empty group; our parser treats 'root:' as owner 'root' and group ''
    expect(code).toBe(0);
    const node = ctx.terminal
      .getFileSystem()
      .getNode('/home/busykoala/file1.txt', ctx.env.USER, 'busygroup') as any;
    expect(node.owner).toBe('root');
  });

  it('changes group only (:group)', async () => {
    const io = createMockIO();
    const ctx = createMockContext();

    const code = await chownAsync([':newgroup', 'file1.txt'], ctx, io);
    expect(code).toBe(0);
    const node = ctx.terminal
      .getFileSystem()
      .getNode('/home/busykoala/file1.txt', ctx.env.USER, 'busygroup') as any;
    expect(node.group).toBe('newgroup');
  });

  it('recurses with -R and changes children', async () => {
    const io = createMockIO();
    const ctx = createMockContext();

    const code = await chownAsync(['-R', 'alice:staff', 'subdir'], ctx, io);
    expect(code).toBe(0);
    const child = ctx.terminal
      .getFileSystem()
      .getNode('/home/busykoala/subdir/inner.txt', ctx.env.USER, 'busygroup') as any;
    expect(child.owner).toBe('alice');
    expect(child.group).toBe('staff');
  });

  it('force -f suppresses errors for missing files', async () => {
    const io = createMockIO();
    const ctx = createMockContext();

    const code = await chownAsync(['-f', 'root', 'no-such.file'], ctx, io);
    expect(code).toBe(0);
    expect((io as any)._stderr.length).toBe(0);
  });

  it('verbose -v prints change messages', async () => {
    const io = createMockIO();
    const ctx = createMockContext();

    const code = await chownAsync(['-v', 'bob:wheel', 'file1.txt'], ctx, io);
    expect(code).toBe(0);
    const out = (io as any)._stdout.join('');
    expect(out).toContain("changed ownership of 'file1.txt'");
  });

  it('changes-only -c prints only when change occurs', async () => {
    const io = createMockIO();
    const ctx = createMockContext();
    // No change
    let code = await chownAsync(['-c', 'busykoala:busygroup', 'file1.txt'], ctx, io);
    expect(code).toBe(0);
    expect((io as any)._stdout.join('')).toBe('');
    // Change
    (io as any)._stdout.length = 0;
    code = await chownAsync(['-c', 'alice:staff', 'file1.txt'], ctx, io);
    expect(code).toBe(0);
    expect((io as any)._stdout.join('')).toContain("changed ownership of 'file1.txt'");
  });

  it('prints version with --version', async () => {
    const io = createMockIO();
    const ctx = createMockContext();
    const code = await chownAsync(['--version', 'root', 'file1.txt'], ctx, io);
    expect(code).toBe(0);
    expect((io as any)._stdout.join('')).toMatch(
      /GNU coreutils simulation|chown \(GNU coreutils simulation\)/i,
    );
  });
});
