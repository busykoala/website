import { describe, it, expect } from 'vitest';
import { idAsync } from '../../commands/idAsync';
import type { CommandContext } from '../../core/TerminalCore';

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
    terminal: {} as any,
    shell: null as any,
  } as any;
}

describe('id', () => {
  it('prints uid/gid/groups', async () => {
    const c = ctx();
    const streams = io();
    const code = await idAsync([], c, streams);
    expect(code).toBe(0);
    const out = (streams as any)._stdout.join('');
    expect(out).toContain('uid=');
    expect(out).toContain('gid=');
    expect(out).toContain('groups=');
  });

  it('shows help and version', async () => {
    const c = ctx();
    let streams = io();
    let code = await idAsync(['--help'], c, streams);
    expect(code).toBe(0);
    expect((streams as any)._stdout.join('').toLowerCase()).toContain('id');
    streams = io();
    code = await idAsync(['--version'], c, streams);
    expect(code).toBe(0);
    expect((streams as any)._stdout.join('')).toMatch(/id .*1.0.0/);
  });

  it('prints only user with -u', async () => {
    const c = ctx();
    const streams = io();
    await idAsync(['-u'], c, streams);
    const out = (streams as any)._stdout.join('');
    expect(out.trim()).toBe('busykoala');
  });

  it('prints only primary group with -g', async () => {
    const c = ctx();
    const streams = io();
    await idAsync(['-g'], c, streams);
    const out = (streams as any)._stdout.join('');
    expect(out.trim()).toBe('busygroup');
  });

  it('prints all groups with -G (space-separated)', async () => {
    const c = ctx();
    const streams = io();
    await idAsync(['-G'], c, streams);
    const out = (streams as any)._stdout.join('');
    expect(out).toContain('busygroup');
    expect(out).toContain('staff');
    expect(out).toContain('developers');
  });

  it('supports multiple selection flags together', async () => {
    const c = ctx();
    const streams = io();
    await idAsync(['-u', '-g'], c, streams);
    const lines = (streams as any)._stdout.join('').split('\n');
    expect(lines[0].trim()).toBe('busykoala');
    expect(lines[1].trim()).toBe('busygroup');
  });

  it('treats -a like default verbose', async () => {
    const c = ctx();
    const s1 = io();
    const s2 = io();
    await idAsync([], c, s1);
    await idAsync(['-a'], c, s2);
    expect((s2 as any)._stdout.join('')).toBe((s1 as any)._stdout.join(''));
  });

  it('-n and -r are accepted (names only / real IDs)', async () => {
    const c = ctx();
    const s = io();
    await idAsync(['-n', '-u'], c, s);
    expect((s as any)._stdout.join('').trim()).toBe('busykoala');
    const s2 = io();
    await idAsync(['-r', '-u'], c, s2);
    expect((s2 as any)._stdout.join('').trim()).toBe('busykoala');
  });
});
