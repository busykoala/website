import { describe, it, expect, vi } from 'vitest';
import type { CommandContext } from '../../core/TerminalCore';
import type { IOStreams } from '../../core/streams';

function io(): IOStreams & { _stdout: string[]; _stderr: string[] } {
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

// Create deterministic cookie sets for tests
const SHORTS = ['alpha short', 'beta short'];
const LONG = 'L'.repeat(200);

vi.mock('fortune-cookie', () => ({
  default: [...SHORTS, LONG],
}));

describe('fortune', () => {
  it('prints a fortune with <br> prefix', async () => {
    const { fortuneAsync } = await import('../../commands/fortuneAsync');
    const streams = io();
    const c = ctx();
    const code = await fortuneAsync([], c, streams);
    expect(code).toBe(0);
    expect(streams._stdout.join('')).toMatch(/^<br>/);
  });

  it('shows help and version', async () => {
    const { fortuneAsync } = await import('../../commands/fortuneAsync');
    const c = ctx();
    const out: string[] = [];
    const streams = {
      stdout: { write: (d: string) => out.push(d), on: () => {} },
      stderr: { write: () => {}, on: () => {} },
      stdin: { read: () => '', on: () => {} },
    } as any;
    let code = await fortuneAsync(['--help'], c, streams);
    expect(code).toBe(0);
    expect(out.join('').toLowerCase()).toContain('fortune');
    out.length = 0;
    code = await fortuneAsync(['--version'], c, streams);
    expect(code).toBe(0);
    expect(out.join('').toLowerCase()).toContain('fortune');
  });

  it('lists sources with -f', async () => {
    const { fortuneAsync } = await import('../../commands/fortuneAsync');
    const c = ctx();
    const streams = io();
    const code = await fortuneAsync(['-f'], c, streams);
    expect(code).toBe(0);
    expect(streams._stdout.join('')).toContain('fortune-cookie');
  });

  it('prefixes with [fortune] when -c is used', async () => {
    const { fortuneAsync } = await import('../../commands/fortuneAsync');
    const c = ctx();
    const streams = io();
    const code = await fortuneAsync(['-c'], c, streams);
    expect(code).toBe(0);
    expect(streams._stdout.join('')).toMatch(/^<br>\[fortune\] /);
  });

  it('filters by pattern with -m', async () => {
    const { fortuneAsync } = await import('../../commands/fortuneAsync');
    const c = ctx();
    const streams = io();
    const code = await fortuneAsync(['-m', 'alpha'], c, streams);
    expect(code).toBe(0);
    expect(streams._stdout.join('').toLowerCase()).toContain('alpha');
  });

  it('selects short fortunes with -s and long fortunes with -l', async () => {
    const { fortuneAsync } = await import('../../commands/fortuneAsync');
    const c = ctx();
    const streamsS = io();
    const streamsL = io();
    let code = await fortuneAsync(['-s'], c, streamsS);
    expect(code).toBe(0);
    const shortOut = streamsS._stdout.join('');
    expect(shortOut.length).toBeLessThan(160 + 20); // +prefix and <br>

    code = await fortuneAsync(['-l'], c, streamsL);
    expect(code).toBe(0);
    const longOut = streamsL._stdout.join('');
    expect(longOut.length).toBeGreaterThanOrEqual(160);
  });
});
