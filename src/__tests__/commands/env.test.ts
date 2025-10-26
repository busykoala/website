import { describe, it, expect } from 'vitest';
import { envAsync } from '../../commands/envAsync';
import type { CommandContext } from '../../core/TerminalCore';
import type { IOStreams } from '../../core/streams';
import { FileSystem } from '../../core/filesystem';
import { addBaseFilesystem } from '../../core/addBaseFilesystem';
import { echoAsyncCommand } from '../../commands/echoAsync';

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

function createCtx(): CommandContext {
  const fs = new FileSystem();
  addBaseFilesystem(fs);
  const ctx: CommandContext = {
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
  // Provide a minimal shell registry for running subcommands
  (ctx as any).shell = {
    getCommands: () => ({
      echo: { fn: echoAsyncCommand.execute, description: 'echo', usage: 'echo' },
    }),
  };
  return ctx;
}

describe('env', () => {
  it('prints environment variables', async () => {
    const io = createIO();
    const c = createCtx();
    const code = await envAsync([], c, io);
    expect(code).toBe(0);
    const out = io._stdout.join('');
    expect(out).toContain('PWD=/home/busykoala');
    expect(out).toContain('PATH=/bin');
    expect(out).not.toContain('COMMANDS=');
  });

  it('shows help', async () => {
    const io = createIO();
    const c = createCtx();
    const code = await envAsync(['--help'], c, io);
    expect(code).toBe(0);
    expect(io._stdout.join('').toLowerCase()).toContain('usage');
    expect(io._stdout.join('').toLowerCase()).toContain('env');
  });

  it('supports -i to ignore environment', async () => {
    const io = createIO();
    const c = createCtx();
    const code = await envAsync(['-i'], c, io);
    expect(code).toBe(0);
    const out = io._stdout.join('');
    expect(out).not.toContain('USER=busykoala');
  });

  it('supports -0 to NUL delimit output', async () => {
    const io = createIO();
    const c = createCtx();
    const code = await envAsync(['-0'], c, io);
    expect(code).toBe(0);
    const out = io._stdout.join('');
    expect(out).toContain('\0');
    expect(out).not.toContain('<br>');
  });

  it('supports unsetting variables with -u', async () => {
    const io = createIO();
    const c = createCtx();
    const code = await envAsync(['-u', 'USER'], c, io);
    expect(code).toBe(0);
    expect(io._stdout.join('')).not.toContain('USER=');
  });

  it('applies NAME=VALUE assignments to printout', async () => {
    const io = createIO();
    const c = createCtx();
    const code = await envAsync(['FOO=bar', 'BAZ=qux'], c, io);
    expect(code).toBe(0);
    const out = io._stdout.join('');
    expect(out).toContain('FOO=bar');
    expect(out).toContain('BAZ=qux');
  });

  it('runs a command with modified environment', async () => {
    const io = createIO();
    const c = createCtx();
    const code = await envAsync(['-i', 'FOO=bar', 'echo', '"$FOO"'], c, io);
    expect(code).toBe(0);
    expect(io._stdout.join('')).toBe('bar\n');
  });

  it('unsets a var for the invoked command', async () => {
    const io = createIO();
    const c = createCtx();
    const code = await envAsync(['-u', 'USER', 'echo', '"$USER"'], c, io);
    expect(code).toBe(0);
    expect(io._stdout.join('')).toBe('\n');
  });

  it('changes directory for command with -C', async () => {
    const io = createIO();
    const c = createCtx();
    const code = await envAsync(['-C', '/', 'echo', '"$PWD"'], c, io);
    expect(code).toBe(0);
    expect(io._stdout.join('')).toBe('/\n');
  });

  it('errors when -C points to non-existent dir', async () => {
    const io = createIO();
    const c = createCtx();
    const code = await envAsync(['-C', '/no/such', 'echo', 'X'], c, io);
    expect(code).toBe(1);
    expect(io._stderr.join('')).toContain('cannot change directory');
  });

  it('supports -S to split string into command arguments', async () => {
    const io = createIO();
    const c = createCtx();
    const code = await envAsync(['-S', 'echo hello world'], c, io);
    expect(code).toBe(0);
    expect(io._stdout.join('')).toBe('hello world\n');
  });

  it('treats single dash as ignore env', async () => {
    const io = createIO();
    const c = createCtx();
    const code = await envAsync(['-', 'FOO=1'], c, io);
    expect(code).toBe(0);
    const out = io._stdout.join('');
    expect(out).toContain('FOO=1');
    expect(out).not.toContain('USER=busykoala');
  });
});
