import { describe, it, expect } from 'vitest';
import { cpAsync } from '../../commands/cpAsync';
import type { CommandContext } from '../../core/TerminalCore';
import type { IOStreams } from '../../core/streams';
import { FileSystem } from '../../core/filesystem';
import { addBaseFilesystem } from '../../core/addBaseFilesystem';

function io(): IOStreams {
  return {
    stdout: { write: () => {} } as any,
    stderr: { write: () => {} } as any,
    stdin: { read: () => '', on: () => {} } as any,
  } as any;
}

function ctx(): CommandContext {
  const fs = new FileSystem();
  addBaseFilesystem(fs);
  fs.addFile(
    '/home/busykoala',
    'a.txt',
    'busykoala',
    'busygroup',
    'busykoala',
    'busygroup',
    'A',
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

describe('cp', () => {
  it('copies file to new name', async () => {
    const c = ctx();
    const fs = c.terminal.getFileSystem();
    const out: string[] = [];
    const err: string[] = [];
    const streams = {
      ...io(),
      stdout: { write: (d: string) => out.push(d), on: () => {} },
      stderr: { write: (d: string) => err.push(d), on: () => {} },
    } as any;
    const code = await cpAsync(['a.txt', 'b.txt'], c, streams);
    expect(code).toBe(0);
    const node = fs.getNode('/home/busykoala/b.txt', 'busykoala', 'busygroup');
    expect(node && node.type === 'file').toBe(true);
  });

  it('copies into directory', async () => {
    const c = ctx();
    const fs = c.terminal.getFileSystem();
    fs.addDirectory('/home/busykoala', 'dir', 'busykoala', 'busygroup', 'busykoala', 'busygroup');
    const code = await cpAsync(['a.txt', 'dir'], c, io());
    expect(code).toBe(0);
    const node = fs.getNode('/home/busykoala/dir/a.txt', 'busykoala', 'busygroup');
    expect(node && node.type === 'file').toBe(true);
  });

  it('recursively copies directory with -r', async () => {
    const c = ctx();
    const fs = c.terminal.getFileSystem();
    fs.addDirectory('/home/busykoala', 'src', 'busykoala', 'busygroup', 'busykoala', 'busygroup');
    fs.addFile(
      '/home/busykoala/src',
      'f1',
      'busykoala',
      'busygroup',
      'busykoala',
      'busygroup',
      'x',
      'rw-r--r--',
    );
    fs.addDirectory('/home/busykoala', 'dst', 'busykoala', 'busygroup', 'busykoala', 'busygroup');
    const code = await cpAsync(['-r', 'src', 'dst'], c, io());
    expect(code).toBe(0);
    const node = fs.getNode('/home/busykoala/dst/src/f1', 'busykoala', 'busygroup');
    expect(node && node.type === 'file').toBe(true);
  });

  it('does not clobber with -n', async () => {
    const c = ctx();
    const fs = c.terminal.getFileSystem();
    fs.addFile(
      '/home/busykoala',
      'b.txt',
      'busykoala',
      'busygroup',
      'busykoala',
      'busygroup',
      'B',
      'rw-r--r--',
    );
    const code = await cpAsync(['-n', 'a.txt', 'b.txt'], c, io());
    expect(code).toBe(0);
    const node = fs.getNode('/home/busykoala/b.txt', 'busykoala', 'busygroup') as any;
    expect(node.content).toBe('B');
  });

  it('prints version with --version', async () => {
    const c = ctx();
    const out: string[] = [];
    const streams = { ...io(), stdout: { write: (d: string) => out.push(d), on: () => {} } } as any;
    const code = await cpAsync(['--version'], c, streams);
    expect(code).toBe(0);
    expect(out.join('')).toMatch(/GNU coreutils simulation|cp \(GNU coreutils simulation\)/i);
  });

  it('verbose mode -v logs operations', async () => {
    const c = ctx();
    const fs = c.terminal.getFileSystem();
    const out: string[] = [];
    const streams = { ...io(), stdout: { write: (d: string) => out.push(d), on: () => {} } } as any;
    const code = await cpAsync(['-v', 'a.txt', 'c.txt'], c, streams);
    expect(code).toBe(0);
    const msg = out.join('');
    expect(msg).toContain('/home/busykoala/a.txt');
    expect(msg).toContain('/home/busykoala/c.txt');
    const node = fs.getNode('/home/busykoala/c.txt', 'busykoala', 'busygroup');
    expect(!!node).toBe(true);
  });

  it('update only with -u skips when destination newer, copies when source newer', async () => {
    const c = ctx();
    const fs = c.terminal.getFileSystem();
    // Prepare dest newer than source
    fs.addFile(
      '/home/busykoala',
      'u.txt',
      'busykoala',
      'busygroup',
      'busykoala',
      'busygroup',
      'OLD',
      'rw-r--r--',
    );
    const src = fs.getNode('/home/busykoala/a.txt', 'busykoala', 'busygroup') as any;
    const dst = fs.getNode('/home/busykoala/u.txt', 'busykoala', 'busygroup') as any;
    // Make destination newer than source
    src.modified = new Date(1000);
    dst.modified = new Date(2000);
    let code = await cpAsync(['-u', 'a.txt', 'u.txt'], c, io());
    expect(code).toBe(0);
    expect((fs.getNode('/home/busykoala/u.txt', 'busykoala', 'busygroup') as any).content).toBe(
      'OLD',
    );
    // Make source newer
    src.modified = new Date(3000);
    code = await cpAsync(['-u', 'a.txt', 'u.txt'], c, io());
    expect(code).toBe(0);
    expect((fs.getNode('/home/busykoala/u.txt', 'busykoala', 'busygroup') as any).content).toBe(
      'A',
    );
  });

  it('creates backup with -b when overwriting', async () => {
    const c = ctx();
    const fs = c.terminal.getFileSystem();
    fs.addFile(
      '/home/busykoala',
      'bk.txt',
      'busykoala',
      'busygroup',
      'busykoala',
      'busygroup',
      'DEST',
      'rw-r--r--',
    );
    const code = await cpAsync(['-b', 'a.txt', 'bk.txt'], c, io());
    expect(code).toBe(0);
    const backup = fs.getNode('/home/busykoala/bk.txt~', 'busykoala', 'busygroup');
    expect(backup && backup.type === 'file').toBe(true);
    expect((backup as any).content).toBe('DEST');
  });

  it('recursively copies directory into new destination path with -R', async () => {
    const c = ctx();
    const fs = c.terminal.getFileSystem();
    fs.addDirectory('/home/busykoala', 'src2', 'busykoala', 'busygroup', 'busykoala', 'busygroup');
    fs.addFile(
      '/home/busykoala/src2',
      'f1',
      'busykoala',
      'busygroup',
      'busykoala',
      'busygroup',
      'y',
      'rw-r--r--',
    );
    // dest path does not exist yet
    const code = await cpAsync(['-R', 'src2', 'dest2'], c, io());
    expect(code).toBe(0);
    const node = fs.getNode('/home/busykoala/dest2/f1', 'busykoala', 'busygroup');
    expect(node && node.type === 'file').toBe(true);
  });
});
