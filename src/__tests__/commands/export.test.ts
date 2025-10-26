import { describe, it, expect } from 'vitest';
import { exportAsync } from '../../commands/exportAsync';
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
      FOO: 'keep',
    },
    version: '2.0.0',
    history: [],
    files: {},
    terminal: {} as any,
    shell: null as any,
  } as any;
}

describe('export', () => {
  it('lists env when no args', async () => {
    const c = ctx();
    const streams = io();
    const code = await exportAsync([], c, streams);
    expect(code).toBe(0);
    const out = (streams as any)._stdout.join('');
    expect(out).toContain('PWD=/home/busykoala');
  });

  it('sets variables with NAME=VALUE', async () => {
    const c = ctx();
    const streams = io();
    const code = await exportAsync(['FOO=bar', 'BAZ=qux'], c, streams);
    expect(code).toBe(0);
    expect(c.env.FOO).toBe('bar');
    expect(c.env.BAZ).toBe('qux');
  });

  it('errors on invalid identifier (missing =)', async () => {
    const c = ctx();
    const streams = io();
    const code = await exportAsync(['FOO'], c, streams);
    expect(code).toBe(1);
    expect((streams as any)._stderr.join('')).toContain('not a valid identifier');
  });

  it('shows help', async () => {
    const c = ctx();
    const streams = io();
    const code = await exportAsync(['--help'], c, streams);
    expect(code).toBe(0);
    expect((streams as any)._stdout.join('').toLowerCase()).toContain('export');
  });

  it('prints exported variables with -p', async () => {
    const c = ctx();
    const streams = io();
    const code = await exportAsync(['-p'], c, streams);
    expect(code).toBe(0);
    const out = (streams as any)._stdout.join('');
    expect(out).toContain('declare -x PWD=');
    expect(out).toContain('<br>');
  });

  it('unexports variables with -n', async () => {
    const c = ctx();
    const streams = io();
    c.env.TEMP = '1';
    const code = await exportAsync(['-n', 'TEMP'], c, streams);
    expect(code).toBe(0);
    expect('TEMP' in c.env).toBe(false);
  });

  it('handles -n for non-existent variable gracefully', async () => {
    const c = ctx();
    const streams = io();
    const code = await exportAsync(['-n', 'DOES_NOT_EXIST'], c, streams);
    expect(code).toBe(0);
  });

  it('errors when using -n with assignment', async () => {
    const c = ctx();
    const streams = io();
    const code = await exportAsync(['-n', 'X=1'], c, streams);
    expect(code).toBe(1);
    expect((streams as any)._stderr.join('')).toContain('invalid use of -n');
  });

  it('supports combined short flags -np for unexport with print flag ignored', async () => {
    const c = ctx();
    const streams = io();
    c.env.KILLME = 'bye';
    const code = await exportAsync(['-np', 'KILLME'], c, streams);
    expect(code).toBe(0);
    expect('KILLME' in c.env).toBe(false);
    expect((streams as any)._stdout.join('')).toBe('');
  });
});
