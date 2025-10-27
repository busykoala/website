import { describe, it, expect } from 'vitest';
import { lsAsync } from '../../commands/lsAsync';
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

describe('ls', () => {
  it('lists directory contents', async () => {
    const io = createMockIO();
    const ctx = createMockContext();
    const code = await lsAsync([], ctx, io);
    expect(code).toBe(0);
    expect((io as any)._stdout.join('')).toContain('about');
  });

  it('shows hidden with -a and -A', async () => {
    const io = createMockIO();
    const ctx = createMockContext();
    const fs = ctx.terminal.getFileSystem();
    fs.addFile(
      '/home/busykoala',
      '.hiddenfile',
      'busykoala',
      'busygroup',
      'busykoala',
      'busygroup',
      'test',
      'rw-r--r--',
    );
    let code = await lsAsync(['-a'], ctx, io);
    expect(code).toBe(0);
    expect((io as any)._stdout.join('')).toContain('.hiddenfile');
    (io as any)._stdout.length = 0;
    code = await lsAsync(['-A'], ctx, io);
    expect(code).toBe(0);
    expect((io as any)._stdout.join('')).toContain('.hiddenfile');
  });

  it('shows long format with -l and -h', async () => {
    const io = createMockIO();
    const ctx = createMockContext();
    const code = await lsAsync(['-lh'], ctx, io);
    expect(code).toBe(0);
    const out = (io as any)._stdout.join('');
    expect(out).toContain('rwx');
    expect(out).toMatch(/\d+\.\d+[BKMGT]/);
  });

  it('lists a file when given a file path', async () => {
    const io = createMockIO();
    const ctx = createMockContext();
    const code = await lsAsync(['/home/busykoala/links'], ctx, io);
    expect(code).toBe(0);
    const out = (io as any)._stdout.join('');
    expect(out).toContain('links');
    expect((io as any)._stderr.join('')).toBe('');
  });

  it('shows help and version', async () => {
    const io = createMockIO();
    const ctx = createMockContext();
    let code = await lsAsync(['--help'], ctx, io);
    expect(code).toBe(0);
    expect((io as any)._stdout.join('').toLowerCase()).toContain('ls');
    (io as any)._stdout.length = 0;
    code = await lsAsync(['--version'], ctx, io);
    expect(code).toBe(0);
    expect((io as any)._stdout.join('')).toMatch(
      /GNU coreutils simulation|ls \(GNU coreutils simulation\)/i,
    );
  });

  it('-d lists directory itself, not contents', async () => {
    const io = createMockIO();
    const ctx = createMockContext();
    const fs = ctx.terminal.getFileSystem();
    fs.addDirectory('/home/busykoala', 'adir', 'busykoala', 'busygroup', 'busykoala', 'busygroup');
    const code = await lsAsync(['-d', 'adir'], ctx, io);
    expect(code).toBe(0);
    const out = (io as any)._stdout.join('');
    expect(out).toMatch(/adir\/?/);
  });

  it('-F classifies entries (*/)', async () => {
    const io = createMockIO();
    const ctx = createMockContext();
    const fs = ctx.terminal.getFileSystem();
    fs.addFile(
      '/home/busykoala',
      'exec',
      'busykoala',
      'busygroup',
      'busykoala',
      'busygroup',
      'x',
      'rwxr-xr-x',
    );
    fs.addDirectory('/home/busykoala', 'd', 'busykoala', 'busygroup', 'busykoala', 'busygroup');
    const code = await lsAsync(['-F'], ctx, io);
    expect(code).toBe(0);
    const out = (io as any)._stdout.join('');
    expect(out).toContain('exec*');
    expect(out).toMatch(/d\//);
  });

  it('-i prints inode', async () => {
    const io = createMockIO();
    const ctx = createMockContext();
    const code = await lsAsync(['-i', 'links'], ctx, io);
    expect(code).toBe(0);
    const out = (io as any)._stdout.join('');
    expect(out).toMatch(/\d+\s+.*links/);
  });

  it('-r reverses sort order by name', async () => {
    const io = createMockIO();
    const ctx = createMockContext();
    const fs = ctx.terminal.getFileSystem();
    fs.addFile(
      '/home/busykoala',
      'a',
      'busykoala',
      'busygroup',
      'busykoala',
      'busygroup',
      '1',
      'rw-r--r--',
    );
    fs.addFile(
      '/home/busykoala',
      'b',
      'busykoala',
      'busygroup',
      'busykoala',
      'busygroup',
      '1',
      'rw-r--r--',
    );
    const code = await lsAsync(['-r'], ctx, io);
    expect(code).toBe(0);
    const out = (io as any)._stdout.join('');
    const idxA = out.search(/>a(?:\*|\/)?<\/span>/);
    const idxB = out.search(/>b(?:\*|\/)?<\/span>/);
    expect(idxB).toBeGreaterThan(-1);
    expect(idxA).toBeGreaterThan(-1);
    expect(idxB).toBeLessThan(idxA); // b appears before a
  });

  it('-S sorts by size', async () => {
    const io = createMockIO();
    const ctx = createMockContext();
    const fs = ctx.terminal.getFileSystem();
    fs.addFile(
      '/home/busykoala',
      'small',
      'busykoala',
      'busygroup',
      'busykoala',
      'busygroup',
      '1',
      'rw-r--r--',
    );
    fs.addFile(
      '/home/busykoala',
      'large',
      'busykoala',
      'busygroup',
      'busykoala',
      'busygroup',
      '12345',
      'rw-r--r--',
    );
    const code = await lsAsync(['-S'], ctx, io);
    expect(code).toBe(0);
    const out = (io as any)._stdout.join('');
    expect(out.indexOf('large')).toBeLessThan(out.indexOf('small'));
  });

  it('-t sorts by modification time', async () => {
    const io = createMockIO();
    const ctx = createMockContext();
    const fs = ctx.terminal.getFileSystem();
    fs.addFile(
      '/home/busykoala',
      'old',
      'busykoala',
      'busygroup',
      'busykoala',
      'busygroup',
      'x',
      'rw-r--r--',
    );
    fs.addFile(
      '/home/busykoala',
      'new',
      'busykoala',
      'busygroup',
      'busykoala',
      'busygroup',
      'x',
      'rw-r--r--',
    );
    const oldNode = fs.getNode('/home/busykoala/old', 'busykoala', 'busygroup') as any;
    const newNode = fs.getNode('/home/busykoala/new', 'busykoala', 'busygroup') as any;
    oldNode.modified = new Date(1000);
    newNode.modified = new Date(2000);
    const code = await lsAsync(['-t'], ctx, io);
    expect(code).toBe(0);
    const out = (io as any)._stdout.join('');
    expect(out.indexOf('new')).toBeLessThan(out.indexOf('old'));
  });

  it('-1 prints one entry per line', async () => {
    const io = createMockIO();
    const ctx = createMockContext();
    const code = await lsAsync(['-1'], ctx, io);
    expect(code).toBe(0);
    const out = (io as any)._stdout.join('');
    expect(out).toContain('<br>');
  });

  it('--color=never disables color spans', async () => {
    const io = createMockIO();
    const ctx = createMockContext();
    const code = await lsAsync(['--color=never'], ctx, io);
    expect(code).toBe(0);
    const out = (io as any)._stdout.join('');
    expect(out).not.toContain('<span');
  });

  it('-R lists recursively with headers', async () => {
    const io = createMockIO();
    const ctx = createMockContext();
    const fs = ctx.terminal.getFileSystem();
    fs.addDirectory('/home/busykoala', 'rec', 'busykoala', 'busygroup', 'busykoala', 'busygroup');
    fs.addFile(
      '/home/busykoala/rec',
      'f',
      'busykoala',
      'busygroup',
      'busykoala',
      'busygroup',
      'x',
      'rw-r--r--',
    );
    const code = await lsAsync(['-R'], ctx, io);
    expect(code).toBe(0);
    const out = (io as any)._stdout.join('');
    expect(out).toContain('/home/busykoala:');
    expect(out).toContain('/home/busykoala/rec:');
  });

  it('lists multiple targets with a separator between outputs', async () => {
    const io = createMockIO();
    const ctx = createMockContext();
    // Use a file/dir from home and the home directory itself
    const code = await lsAsync(['links', '/home/busykoala'], ctx, io);
    expect(code).toBe(0);
    const out = (io as any)._stdout.join('');
    // Should contain entries from both targets and have a blank line separation (<br><br>)
    expect(out).toContain('links');
    expect(out).toContain('about');
    expect(out).toContain('<br><br>');
  });
});
