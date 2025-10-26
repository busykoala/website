import { describe, it, expect } from 'vitest';
import { clearAsync } from '../../commands/clearAsync';
import type { CommandContext } from '../../core/TerminalCore';
import type { IOStreams } from '../../core/streams';

function io(): IOStreams {
  return {
    stdout: { write: () => {} } as any,
    stderr: { write: () => {} } as any,
    stdin: { read: () => '', on: () => {} } as any,
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
    shell: { clear: () => {} } as any,
  } as any;
}

describe('clear', () => {
  it('invokes shell.clear and succeeds', async () => {
    const c = ctx();
    let called = false;
    (c as any).shell.clear = () => {
      called = true;
    };
    const code = await clearAsync([], c, io());
    expect(code).toBe(0);
    expect(called).toBe(true);
  });

  it('shows help', async () => {
    const c = ctx();
    const out: string[] = [];
    const streams = {
      stdout: { write: (d: string) => out.push(d), on: () => {} },
      stderr: { write: () => {}, on: () => {} },
      stdin: { read: () => '', on: () => {} },
    } as any;
    const code = await clearAsync(['--help'], c, streams);
    expect(code).toBe(0);
    expect(out.join('').toLowerCase()).toContain('clear');
  });

  it('supports -x and still clears', async () => {
    const c = ctx();
    let called = false;
    (c as any).shell.clear = () => {
      called = true;
    };
    const code = await clearAsync(['-x'], c, io());
    expect(code).toBe(0);
    expect(called).toBe(true);
  });

  it('supports -T TYPE and still clears', async () => {
    const c = ctx();
    let called = false;
    (c as any).shell.clear = () => {
      called = true;
    };
    const code = await clearAsync(['-T', 'xterm-256color'], c, io());
    expect(code).toBe(0);
    expect(called).toBe(true);
  });

  it('supports --version and does not clear', async () => {
    const c = ctx();
    let called = false;
    (c as any).shell.clear = () => {
      called = true;
    };
    const out: string[] = [];
    const streams = {
      stdout: { write: (d: string) => out.push(d), on: () => {} },
      stderr: { write: () => {}, on: () => {} },
      stdin: { read: () => '', on: () => {} },
    } as any;
    const code = await clearAsync(['--version'], c, streams);
    expect(code).toBe(0);
    expect(out.join('')).toMatch(/clear .*1.0.0/);
    expect(called).toBe(false);
  });
});
