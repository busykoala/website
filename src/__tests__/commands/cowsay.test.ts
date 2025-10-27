import { describe, it, expect } from 'vitest';
import { cowsayAsync } from '../../commands/cowsayAsync';
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

describe('cowsay', () => {
  it('prints cow with message box', async () => {
    const c = ctx();
    const streams = io();
    const code = await cowsayAsync(['hello world'], c, streams);
    expect(code).toBe(0);
    const out = (streams as any)._stdout.join('');
    expect(out).toContain('^__^');
    expect(out.toLowerCase()).toContain('hello');
  });

  it('errors on empty message', async () => {
    const c = ctx();
    const streams = io();
    const code = await cowsayAsync([], c, streams);
    expect(code).toBe(1);
    expect((streams as any)._stderr.join('').toLowerCase()).toContain('no message');
  });

  it('shows help', async () => {
    const c = ctx();
    const streams = io();
    const code = await cowsayAsync(['--help'], c, streams);
    expect(code).toBe(0);
    expect((streams as any)._stdout.join('').toLowerCase()).toContain('cowsay');
  });

  it('supports -e to set eyes', async () => {
    const c = ctx();
    const streams = io();
    const code = await cowsayAsync(['-e', 'XX', 'msg'], c, streams);
    expect(code).toBe(0);
    expect((streams as any)._stdout.join('')).toContain('(XX)');
  });

  it('supports -T to set tongue', async () => {
    const c = ctx();
    const streams = io();
    const code = await cowsayAsync(['-T', 'U ', 'msg'], c, streams);
    expect(code).toBe(0);
    // Tongue is shown after ||----
    const out = (streams as any)._stdout.join('');
    expect(out).toContain('||----U');
  });

  it('wraps text with -W width', async () => {
    const c = ctx();
    const streams = io();
    const long = 'one two three four five six seven eight nine ten';
    const code = await cowsayAsync(['-W', '10', long], c, streams);
    expect(code).toBe(0);
    const out = (streams as any)._stdout.join('');
    // Multi-line bubble should include both starting "/" and ending "\\" bubble lines
    expect(out).toContain('&nbsp;/ ');
    expect(out).toContain('&nbsp;\\ ');
  });

  it('supports -f tux variant', async () => {
    const c = ctx();
    const streams = io();
    const code = await cowsayAsync(['-f', 'tux', 'hi'], c, streams);
    expect(code).toBe(0);
    const out = (streams as any)._stdout.join('');
    expect(out).toContain('.___.');
  });

  it('errors on unknown cowfile', async () => {
    const c = ctx();
    const streams = io();
    const code = await cowsayAsync(['-f', 'unknown', 'hi'], c, streams);
    expect(code).toBe(1);
    expect((streams as any)._stderr.join('')).toContain('unknown cowfile');
  });

  it('prints version with --version', async () => {
    const c = ctx();
    const streams = io();
    const code = await cowsayAsync(['--version'], c, streams);
    expect(code).toBe(0);
    expect((streams as any)._stdout.join('').toLowerCase()).toContain('cowsay');
  });
});
