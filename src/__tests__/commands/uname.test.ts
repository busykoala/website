import { describe, it, expect } from 'vitest';
import { unameAsync } from '../../commands/unameAsync';
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

describe('uname', () => {
  it('prints kernel name by default', async () => {
    const c = ctx();
    const streams = io();
    const code = await unameAsync([], c, streams);
    expect(code).toBe(0);
    expect((streams as any)._stdout.join('')).toBe('BusykoalaOS');
  });

  it('prints all with -a', async () => {
    const c = ctx();
    const streams = io();
    const code = await unameAsync(['-a'], c, streams);
    expect(code).toBe(0);
    const out = (streams as any)._stdout.join('');
    // BusykoalaOS busykoala-2 1.0 Version 1.0 x42_42 unknown unknown BusykoalaOS
    const parts = out.split(' ');
    expect(parts.length).toBeGreaterThanOrEqual(5);
  });

  it('shows help and version', async () => {
    const c = ctx();
    const s1 = io();
    let code = await unameAsync(['--help'], c, s1);
    expect(code).toBe(0);
    expect((s1 as any)._stdout.join('').toLowerCase()).toContain('uname');
    const s2 = io();
    code = await unameAsync(['--version'], c, s2);
    expect(code).toBe(0);
    expect((s2 as any)._stdout.join('')).toMatch(/uname .*1.0.0/);
  });

  it('prints individual fields with flags', async () => {
    const c = ctx();
    const check = async (flag: string, expected: string) => {
      const s = io();
      await unameAsync([flag], c, s);
      expect((s as any)._stdout.join('')).toBe(expected);
    };
    await check('-s', 'BusykoalaOS');
    await check('-n', 'busykoala-2');
    await check('-r', '1.0');
    await check('-v', 'Version 1.0');
    await check('-m', 'x42_42');
    await check('-p', 'unknown');
    await check('-i', 'unknown');
    await check('-o', 'BusykoalaOS');
  });

  it('supports combined flags preserving order', async () => {
    const c = ctx();
    const s = io();
    await unameAsync(['-snr'], c, s);
    expect((s as any)._stdout.join('')).toBe('BusykoalaOS busykoala-2 1.0');
  });
});
