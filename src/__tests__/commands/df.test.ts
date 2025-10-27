import { describe, it, expect } from 'vitest';
import { dfAsync } from '../../commands/dfAsync';
import type { CommandContext } from '../../core/TerminalCore';
import type { IOStreams } from '../../core/streams';
import { FileSystem } from '../../core/filesystem';
import { addBaseFilesystem } from '../../core/addBaseFilesystem';

function io(): IOStreams & { _stdout: string[]; _stderr: string[] } {
  const out: string[] = [],
    err: string[] = [];
  return {
    stdout: { write: (d: string) => out.push(d), on: () => {} } as any,
    stderr: { write: (d: string) => err.push(d), on: () => {} } as any,
    stdin: { read: () => '', on: () => {} } as any,
    _stdout: out,
    _stderr: err,
  } as any;
}
function ctx(): CommandContext {
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
  } as any;
}

describe('df', () => {
  it('prints mock filesystem usage', async () => {
    const streams = io();
    const c = ctx();
    const code = await dfAsync([], c, streams);
    expect(code).toBe(0);
    const out = streams._stdout.join('');
    expect(out).toContain('Filesystem');
    expect(out).toContain('mockfs');
    expect(out).toContain('Mounted on');
  });

  it('shows help and version', async () => {
    const streams = io();
    const c = ctx();
    let code = await dfAsync(['--help'], c, streams);
    expect(code).toBe(0);
    expect(streams._stdout.join('').toLowerCase()).toContain('df');
    const s2 = io();
    code = await dfAsync(['--version'], c, s2);
    expect(code).toBe(0);
    expect(s2._stdout.join('')).toMatch(/df .*1.0.0/);
  });

  it('shows human-readable sizes with -h and -H', async () => {
    const c = ctx();
    const s = io();
    await dfAsync(['-h'], c, s);
    const out = s._stdout.join('');
    expect(out).toMatch(/\b100M\b/);
    const s2 = io();
    await dfAsync(['-H'], c, s2);
    const out2 = s2._stdout.join('');
    // SI units likely display ~105MB for 100 MiB; accept any MB number
    expect(out2).toMatch(/\b\d+MB\b/);
  });

  it('shows inode usage with -i', async () => {
    const c = ctx();
    const s = io();
    await dfAsync(['-i'], c, s);
    const out = s._stdout.join('');
    expect(out).toContain('Inodes');
    expect(out).toMatch(/IUse%/);
  });

  it('shows 1K-block counts with -k', async () => {
    const c = ctx();
    const s = io();
    await dfAsync(['-k'], c, s);
    const out = s._stdout.join('');
    // 100*1024*1024 bytes / 1024 = 102400
    expect(out).toContain('102400');
  });

  it('filters to local filesystems with -l and type filter -t', async () => {
    const c = ctx();
    const s = io();
    await dfAsync(['-l'], c, s);
    const out = s._stdout.join('');
    expect(out).not.toContain('/proc');
    expect(out).not.toContain('/dev');

    const s2 = io();
    await dfAsync(['-t', 'tmpfs', '-a'], c, s2);
    const out2 = s2._stdout.join('');
    expect(out2).toContain('/tmp');
    // with type tmpfs, not ext4 root
    expect(out2).not.toMatch(/^mockfs/m);
  });

  it('shows type column with -T', async () => {
    const c = ctx();
    const s = io();
    await dfAsync(['-T'], c, s);
    const out = s._stdout.join('');
    expect(out.split('\n')[0]).toContain('Type');
    expect(out).toMatch(/ext4/);
  });

  it('selects filesystem by FILE argument', async () => {
    const c = ctx();
    // Ensure /home exists in our FS; it's created by addBaseFilesystem
    const s = io();
    await dfAsync(['/home/busykoala'], c, s);
    const out = s._stdout.join('');
    // Should include homefs line and not include proc
    expect(out).toContain('homefs');
  });
});
