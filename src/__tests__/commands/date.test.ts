import { describe, it, expect } from 'vitest';
import { dateAsync } from '../../commands/dateAsync';
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

describe('date', () => {
  it('prints current date string (RFC2822-like default)', async () => {
    const streams = io();
    const c = ctx();
    const code = await dateAsync([], c, streams);
    expect(code).toBe(0);
    const out = streams._stdout.join('');
    expect(out).toMatch(/\w{3}, \d{2} \w{3} \d{4} \d{2}:\d{2}:\d{2} [+-]\d{4}/);
  });

  it('shows help and version', async () => {
    const c = ctx();
    let streams = io();
    let code = await dateAsync(['--help'], c, streams);
    expect(code).toBe(0);
    expect(streams._stdout.join('').toLowerCase()).toContain('date');
    streams = io();
    code = await dateAsync(['--version'], c, streams);
    expect(code).toBe(0);
    expect(streams._stdout.join('')).toMatch(/date .*1.0.0/);
  });

  it('formats with --iso-8601 and -u', async () => {
    const c = ctx();
    const s = io();
    const code = await dateAsync(
      ['-u', '--iso-8601=seconds', '-d', '2020-01-02 03:04:05 UTC'],
      c,
      s,
    );
    expect(code).toBe(0);
    expect(s._stdout.join('')).toBe('2020-01-02T03:04:05+00:00');
    const s2 = io();
    await dateAsync(['-u', '--iso-8601=date', '-d', '2020-01-02 03:04:05 UTC'], c, s2);
    expect(s2._stdout.join('')).toBe('2020-01-02');
  });

  it('formats with --rfc-2822 and --rfc-3339', async () => {
    const c = ctx();
    const s = io();
    await dateAsync(['-u', '--rfc-2822', '-d', '2020-07-08 09:10:11 UTC'], c, s);
    expect(s._stdout.join('')).toMatch(/^\w{3}, 08 \w{3} 2020 09:10:11 \+0000$/);
    const s2 = io();
    await dateAsync(['-u', '--rfc-3339=seconds', '-d', '2020-07-08 09:10:11 UTC'], c, s2);
    expect(s2._stdout.join('')).toBe('2020-07-08 09:10:11+00:00');
  });

  it('supports custom +FORMAT', async () => {
    const c = ctx();
    const s = io();
    await dateAsync(['-u', '+%Y-%m-%d %H:%M:%S', '-d', '1999-12-31 23:59:58 UTC'], c, s);
    expect(s._stdout.join('')).toBe('1999-12-31 23:59:58');
  });

  it('parses -d and errors on invalid date', async () => {
    const c = ctx();
    const s = io();
    let code = await dateAsync(['-d', '2024-03-05 06:07:08 UTC', '-u', '--iso-8601=seconds'], c, s);
    expect(code).toBe(0);
    expect(s._stdout.join('')).toBe('2024-03-05T06:07:08+00:00');
    const s2 = io();
    code = await dateAsync(['-d', 'not-a-date'], c, s2);
    expect(code).toBe(1);
    expect(s2._stderr.join('')).toContain('invalid date');
  });

  it('reads dates from file with -f', async () => {
    const c = ctx();
    const fs = (c.terminal as any).getFileSystem();
    fs.addFile(
      '/home/busykoala',
      'dates.txt',
      'busykoala',
      'busygroup',
      'busykoala',
      'busygroup',
      '2020-01-01 00:00:00 UTC\n2020-01-02 12:34:56 UTC',
      'rw-r--r--',
    );
    const s = io();
    await dateAsync(['-u', '-f', 'dates.txt', '--iso-8601=seconds'], c, s);
    const out = s._stdout.join('');
    const lines = out.split(/\n/);
    expect(lines[0]).toBe('2020-01-01T00:00:00+00:00');
    expect(lines[1]).toBe('2020-01-02T12:34:56+00:00');
  });

  it('uses reference file time with -r', async () => {
    const c = ctx();
    const fs = (c.terminal as any).getFileSystem();
    fs.addFile(
      '/home/busykoala',
      'ref.txt',
      'busykoala',
      'busygroup',
      'busykoala',
      'busygroup',
      'x',
      'rw-r--r--',
    );
    const node = fs.getNode('/home/busykoala/ref.txt', 'busykoala', 'busygroup');
    (node as any).modified = new Date(Date.UTC(2022, 0, 2, 3, 4, 5)); // 2022-01-02T03:04:05Z
    const s = io();
    await dateAsync(['-u', '-r', 'ref.txt', '--iso-8601=seconds'], c, s);
    expect(s._stdout.join('')).toBe('2022-01-02T03:04:05+00:00');
  });
});
