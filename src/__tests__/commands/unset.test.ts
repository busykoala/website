import { describe, it, expect } from 'vitest';
import { unsetAsync } from '../../commands/unsetAsync';
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
      FOO: 'bar',
      A: '1',
      B: '2',
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

describe('unset', () => {
  it('unsets existing variable', async () => {
    const c = ctx();
    const streams = io();
    const code = await unsetAsync(['FOO'], c, streams);
    expect(code).toBe(0);
    expect('FOO' in c.env).toBe(false);
  });

  it('ignores unset of missing variable', async () => {
    const c = ctx();
    const streams = io();
    const code = await unsetAsync(['MISSING'], c, streams);
    expect(code).toBe(0);
  });

  it('errors on missing operand', async () => {
    const c = ctx();
    const streams = io();
    const code = await unsetAsync([], c, streams);
    expect(code).toBe(1);
    expect((streams as any)._stderr.join('')).toContain('not enough arguments');
  });

  it('shows help', async () => {
    const c = ctx();
    const streams = io();
    const code = await unsetAsync(['--help'], c, streams);
    expect(code).toBe(0);
    expect((streams as any)._stdout.join('').toLowerCase()).toContain('unset');
  });

  // New tests for -v/-f behavior
  it('supports -v to unset multiple variables', async () => {
    const c = ctx();
    const streams = io();
    const code = await unsetAsync(['-v', 'A', 'B'], c, streams);
    expect(code).toBe(0);
    expect('A' in c.env).toBe(false);
    expect('B' in c.env).toBe(false);
  });

  it('treats -f (functions) as no-op and succeeds', async () => {
    const c = ctx();
    const streams = io();
    c.env.TEMP = '1';
    const code = await unsetAsync(['-f', 'myfunc'], c, streams);
    expect(code).toBe(0);
    expect(c.env.TEMP).toBe('1');
  });

  it('errors when both -v and -f are provided', async () => {
    const c = ctx();
    const streams = io();
    const code = await unsetAsync(['-vf', 'A'], c, streams);
    expect(code).toBe(1);
    expect((streams as any)._stderr.join('')).toContain("cannot use both '-f' and '-v'");
  });

  it('supports end of options -- so names like -n can be unset', async () => {
    const c = ctx();
    const streams = io();
    c.env['-n'] = '1';
    const code = await unsetAsync(['--', '-n'], c, streams);
    expect(code).toBe(0);
    expect('-n' in c.env).toBe(false);
  });
});
