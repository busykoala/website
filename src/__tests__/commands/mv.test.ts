import { describe, it, expect } from 'vitest';
import { mvAsync } from '../../commands/mvAsync';
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

describe('mv', () => {
  it('renames file', async () => {
    const c = ctx();
    const fs = c.terminal.getFileSystem();
    const code = await mvAsync(['a.txt', 'b.txt'], c, io());
    expect(code).toBe(0);
    expect(fs.getNode('/home/busykoala/b.txt', 'busykoala', 'busygroup')).toBeTruthy();
  });

  it('moves file into directory', async () => {
    const c = ctx();
    const fs = c.terminal.getFileSystem();
    fs.addDirectory('/home/busykoala', 'dir', 'busykoala', 'busygroup', 'busykoala', 'busygroup');
    const code = await mvAsync(['a.txt', 'dir'], c, io());
    expect(code).toBe(0);
    expect(fs.getNode('/home/busykoala/dir/a.txt', 'busykoala', 'busygroup')).toBeTruthy();
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
    const code = await mvAsync(['-n', 'a.txt', 'b.txt'], c, io());
    expect(code).toBe(0);
    const dest = fs.getNode('/home/busykoala/b.txt', 'busykoala', 'busygroup') as any;
    expect(dest.content).toBe('B');
    const srcStill = fs.getNode('/home/busykoala/a.txt', 'busykoala', 'busygroup');
    expect(!!srcStill).toBe(true);
  });

  it('creates backup with -b when overwriting', async () => {
    const c = ctx();
    const fs = c.terminal.getFileSystem();
    fs.addFile(
      '/home/busykoala',
      'b.txt',
      'busykoala',
      'busygroup',
      'busykoala',
      'busygroup',
      'DEST',
      'rw-r--r--',
    );
    const code = await mvAsync(['-b', 'a.txt', 'b.txt'], c, io());
    expect(code).toBe(0);
    const backup = fs.getNode('/home/busykoala/b.txt~', 'busykoala', 'busygroup');
    expect(backup && backup.type === 'file').toBe(true);
    const dest = fs.getNode('/home/busykoala/b.txt', 'busykoala', 'busygroup') as any;
    expect(dest.content).toBe('A');
  });

  it('update only with -u skips when destination newer, moves when source newer', async () => {
    const c = ctx();
    const fs = c.terminal.getFileSystem();
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
    src.modified = new Date(1000);
    dst.modified = new Date(2000);
    let code = await mvAsync(['-u', 'a.txt', 'u.txt'], c, io());
    expect(code).toBe(0);
    // skipped; destination unchanged and source still exists
    expect((fs.getNode('/home/busykoala/u.txt', 'busykoala', 'busygroup') as any).content).toBe(
      'OLD',
    );
    expect(fs.getNode('/home/busykoala/a.txt', 'busykoala', 'busygroup')).toBeTruthy();
    // Now source newer
    (fs.getNode('/home/busykoala/a.txt', 'busykoala', 'busygroup') as any).modified = new Date(
      3000,
    );
    code = await mvAsync(['-u', 'a.txt', 'u.txt'], c, io());
    expect(code).toBe(0);
    expect((fs.getNode('/home/busykoala/u.txt', 'busykoala', 'busygroup') as any).content).toBe(
      'A',
    );
    // source removed
    expect(() => fs.getNode('/home/busykoala/a.txt', 'busykoala', 'busygroup')).toThrow();
  });

  it('verbose mode -v logs operations', async () => {
    const c = ctx();
    const out: string[] = [];
    const streams = { ...io(), stdout: { write: (d: string) => out.push(d), on: () => {} } } as any;
    const code = await mvAsync(['-v', 'a.txt', 'c.txt'], c, streams);
    expect(code).toBe(0);
    const msg = out.join('');
    expect(msg).toContain('/home/busykoala/a.txt');
    expect(msg).toContain('/home/busykoala/c.txt');
  });

  it('moves multiple sources into directory', async () => {
    const c = ctx();
    const fs = c.terminal.getFileSystem();
    fs.addFile(
      '/home/busykoala',
      'c.txt',
      'busykoala',
      'busygroup',
      'busykoala',
      'busygroup',
      'C',
      'rw-r--r--',
    );
    fs.addDirectory('/home/busykoala', 'dir', 'busykoala', 'busygroup', 'busykoala', 'busygroup');
    const code = await mvAsync(['a.txt', 'c.txt', 'dir'], c, io());
    expect(code).toBe(0);
    expect(fs.getNode('/home/busykoala/dir/a.txt', 'busykoala', 'busygroup')).toBeTruthy();
    expect(fs.getNode('/home/busykoala/dir/c.txt', 'busykoala', 'busygroup')).toBeTruthy();
  });
});
