import { describe, it, expect } from 'vitest';
import { findAsync } from '../../commands/findAsync';
import type { CommandContext } from '../../core/TerminalCore';
import { FileSystem } from '../../core/filesystem';
import { addBaseFilesystem } from '../../core/addBaseFilesystem';

function io() {
  const out: string[] = [],
    err: string[] = [];
  return {
    stdout: { write: (d: string) => out.push(d), on: () => {} },
    stderr: { write: (d: string) => err.push(d), on: () => {} },
    stdin: { read: () => '', on: () => {} },
    _stdout: out,
    _stderr: err,
  } as any;
}
function ctx(): CommandContext {
  const fs = new FileSystem();
  addBaseFilesystem(fs);
  fs.addDirectory('/home', 'busykoala', 'root', 'root', 'busykoala', 'busygroup');
  fs.addDirectory('/home/busykoala', 'proj', 'busykoala', 'busygroup', 'busykoala', 'busygroup');
  fs.addFile(
    '/home/busykoala/proj',
    'File.TXT',
    'busykoala',
    'busygroup',
    'busykoala',
    'busygroup',
    'hello',
    'rw-r--r--',
  );
  fs.addFile(
    '/home/busykoala/proj',
    'script.sh',
    'busykoala',
    'busygroup',
    'busykoala',
    'busygroup',
    'echo hi',
    'rwxr-xr-x',
  );
  fs.addDirectory(
    '/home/busykoala/proj',
    'sub',
    'busykoala',
    'busygroup',
    'busykoala',
    'busygroup',
  );
  fs.addFile(
    '/home/busykoala/proj/sub',
    'inner.txt',
    'busykoala',
    'busygroup',
    'busykoala',
    'busygroup',
    'a',
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
  } as any;
}

describe('find', () => {
  it('shows help and version', async () => {
    const c = ctx();
    let streams = io();
    let code = await findAsync(['--help'], c, streams);
    expect(code).toBe(0);
    expect((streams as any)._stdout.join('').toLowerCase()).toContain('find');
    streams = io();
    code = await findAsync(['--version'], c, streams);
    expect(code).toBe(0);
    expect((streams as any)._stdout.join('')).toMatch(/find .*1.0.0/);
  });

  it('matches by -name glob and -iname case-insensitive', async () => {
    const c = ctx();
    const streams = io();
    let code = await findAsync(['/home/busykoala', '-name', '*.TXT'], c, streams);
    expect(code).toBe(0);
    const out = (streams as any)._stdout.join('');
    expect(out).toContain('/home/busykoala/proj/File.TXT');

    const streams2 = io();
    code = await findAsync(['/home/busykoala', '-iname', '*.txt'], c, streams2);
    expect(code).toBe(0);
    const out2 = (streams2 as any)._stdout.join('');
    expect(out2).toContain('/home/busykoala/proj/File.TXT');
  });

  it('filters by -type f and -type d', async () => {
    const c = ctx();
    const s1 = io();
    await findAsync(['/home/busykoala', '-type', 'f', '-name', '*.txt'], c, s1);
    expect((s1 as any)._stdout.join('')).toContain('/home/busykoala/proj/sub/inner.txt');
    const s2 = io();
    await findAsync(['/home/busykoala', '-type', 'd', '-name', 'sub'], c, s2);
    expect((s2 as any)._stdout.join('')).toContain('/home/busykoala/proj/sub');
  });

  it('filters by -size exact and +/-', async () => {
    const c = ctx();
    // inner.txt size is 1 byte ('a'), File.TXT size is 5 bytes ('hello')
    let s = io();
    await findAsync(['/home/busykoala', '-type', 'f', '-size', '1'], c, s);
    expect((s as any)._stdout.join('')).toContain('/home/busykoala/proj/sub/inner.txt');
    s = io();
    await findAsync(['/home/busykoala', '-type', 'f', '-size', '+1'], c, s);
    const out = (s as any)._stdout.join('');
    expect(out).toContain('/home/busykoala/proj/File.TXT');
    expect(out).toContain('/home/busykoala/proj/script.sh');
    s = io();
    await findAsync(['/home/busykoala', '-type', 'f', '-size', '-2'], c, s);
    expect((s as any)._stdout.join('')).toContain('/home/busykoala/proj/sub/inner.txt');
  });

  it('filters by -mtime and -newer', async () => {
    const c = ctx();
    const fs = (c.terminal as any).getFileSystem();
    // Make File.TXT modified 3 days ago, inner.txt modified today
    const fileNode = fs.getNode('/home/busykoala/proj/File.TXT', 'busykoala', 'busygroup');
    const innerNode = fs.getNode('/home/busykoala/proj/sub/inner.txt', 'busykoala', 'busygroup');
    if (fileNode) (fileNode as any).modified = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    if (innerNode) (innerNode as any).modified = new Date();

    let s = io();
    await findAsync(['/home/busykoala', '-type', 'f', '-mtime', '+2'], c, s);
    expect((s as any)._stdout.join('')).toContain('/home/busykoala/proj/File.TXT');

    s = io();
    await findAsync(['/home/busykoala', '-type', 'f', '-newer', 'proj/File.TXT'], c, s);
    const out = (s as any)._stdout.join('');
    expect(out).toContain('/home/busykoala/proj/sub/inner.txt');
  });

  it('respects -maxdepth and -mindepth', async () => {
    const c = ctx();
    const s1 = io();
    await findAsync(['/home/busykoala', '-name', '*.txt', '-maxdepth', '1'], c, s1);
    // At depth 1 (immediate children of /home/busykoala) there should be none
    expect((s1 as any)._stdout.join('')).not.toContain('inner.txt');

    const s2 = io();
    await findAsync(['/home/busykoala', '-name', '*.txt', '-mindepth', '3'], c, s2);
    // inner.txt is at depth 3: /home (0) /home/busykoala (1) /home/busykoala/proj (2) /home/busykoala/proj/sub (3)
    expect((s2 as any)._stdout.join('')).toContain('/home/busykoala/proj/sub/inner.txt');
  });

  it('prints with null separators using -print0', async () => {
    const c = ctx();
    const s = io();
    await findAsync(['/home/busykoala', '-type', 'f', '-name', '*.txt', '-print0'], c, s);
    const out: string = (s as any)._stdout.join('');
    expect(out.includes('\0')).toBe(true);
    const parts = out.split('\0').filter(Boolean);
    expect(parts.some((p) => p.endsWith('/inner.txt'))).toBe(true);
  });

  it('supports minimal -exec echo', async () => {
    const c = ctx();
    const s = io();
    await findAsync(
      ['/home/busykoala', '-type', 'f', '-name', 'inner.txt', '-exec', 'echo', 'FILE:', '{}', ';'],
      c,
      s,
    );
    const out = (s as any)._stdout.join('');
    expect(out).toContain('FILE: /home/busykoala/proj/sub/inner.txt');
  });

  it('errors on invalid predicates and missing args', async () => {
    const c = ctx();
    let s = io();
    let code = await findAsync(['/home/busykoala', '-type'], c, s);
    expect(code).toBe(1);
    expect((s as any)._stderr.join('')).toContain('missing argument to `-type`');

    s = io();
    code = await findAsync(['/home/busykoala', '-exec', 'echo', '{}'], c, s);
    expect(code).toBe(1);
    expect((s as any)._stderr.join('')).toContain('missing terminating');

    s = io();
    code = await findAsync(['/home/busykoala', '-unknown'], c, s);
    expect(code).toBe(1);
    expect((s as any)._stderr.join('')).toContain('unknown predicate');
  });
});
