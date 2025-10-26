import { describe, it, expect } from 'vitest';
import { helpAsync } from '../../commands/helpAsync';
import type { CommandContext } from '../../core/TerminalCore';
import type { IOStreams } from '../../core/streams';

function createIO(): IOStreams & { _stdout: string[]; _stderr: string[] } {
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

function ctx(commands: Record<string, { description: string; usage?: string }>): CommandContext {
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
    shell: { getCommands: () => commands } as any,
  } as any;
}

describe('help command', () => {
  it('lists available commands by default', async () => {
    const io = createIO();
    const c = ctx({
      demo: { description: 'Demo desc', usage: 'demo [opts]' },
      echo: { description: 'Echo', usage: 'echo [args]' },
    });
    const code = await helpAsync([], c, io);
    expect(code).toBe(0);
    const out = io._stdout.join('');
    expect(out).toContain('Available Commands');
    expect(out).toContain('demo');
    expect(out).toContain('echo');
  });

  it('shows detailed help for a given command', async () => {
    const io = createIO();
    const c = ctx({ demo: { description: 'Demo desc', usage: 'demo [opts]' } });
    const code = await helpAsync(['demo'], c, io);
    expect(code).toBe(0);
    const out = io._stdout.join('');
    expect(out).toContain('demo');
    expect(out).toContain('Usage:');
    expect(out).toContain('demo [opts]');
    expect(out).toContain('Demo desc');
  });

  it('errors when command is not found', async () => {
    const io = createIO();
    const c = ctx({ demo: { description: 'Demo desc', usage: 'demo [opts]' } });
    const code = await helpAsync(['missing'], c, io);
    expect(code).toBe(1);
    expect(io._stderr.join('').toLowerCase()).toContain('no such command');
  });

  it('shows usage for --help', async () => {
    const io = createIO();
    const c = ctx({});
    const code = await helpAsync(['--help'], c, io);
    expect(code).toBe(0);
    expect(io._stdout.join('').toLowerCase()).toContain('help');
  });

  it('includes Execution model details in default help', async () => {
    const io = createIO();
    const c = ctx({ echo: { description: 'Echo', usage: 'echo [args]' } });
    const code = await helpAsync([], c, io);
    expect(code).toBe(0);
    const out = io._stdout.join('');
    expect(out).toContain('Execution model');
    expect(out).toMatch(/mapped under <code>\/bin<\/code> and <code>\/usr\/bin<\/code>/);
    expect(out).toMatch(/priority: built-ins, direct path, then <code>PATH<\/code> search/);
    expect(out).toMatch(/Shebang scripts/);
  });
});
