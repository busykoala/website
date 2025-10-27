import { describe, it, expect } from 'vitest';
import { historyAsync } from '../../commands/historyAsync';
import type { CommandContext } from '../../core/TerminalCore';
import { FileSystem } from '../../core/filesystem';
import { addBaseFilesystem } from '../../core/addBaseFilesystem';

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
    history: ['ls', 'cat file', 'echo hi'],
    files: {},
    terminal: {} as any,
    shell: null as any,
  } as any;
}

function ctxWithFS(history: string[] = []): { c: CommandContext; fs: FileSystem } {
  const fs = new FileSystem();
  addBaseFilesystem(fs);
  const c: CommandContext = {
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
    history: [...history],
    files: {},
    terminal: { getFileSystem: () => fs } as any,
    shell: null as any,
  } as any;
  return { c, fs };
}

describe('history', () => {
  it('prints numbered history with <br>', async () => {
    const c = ctx();
    const streams = io();
    const code = await historyAsync([], c, streams);
    expect(code).toBe(0);
    const out = (streams as any)._stdout.join('');
    expect(out).toContain('1 ls');
    expect(out).toContain('<br>');
  });

  it('shows help', async () => {
    const c = ctx();
    const streams = io();
    const code = await historyAsync(['--help'], c, streams);
    expect(code).toBe(0);
    expect((streams as any)._stdout.join('').toLowerCase()).toContain('history');
  });

  it('clears history with -c', async () => {
    const { c } = ctxWithFS(['one', 'two']);
    const streams = io();
    const code = await historyAsync(['-c'], c, streams);
    expect(code).toBe(0);
    expect(c.history.length).toBe(0);
    const code2 = await historyAsync([], c, streams);
    expect(code2).toBe(0);
    expect((streams as any)._stdout.join('')).toContain('No commands');
  });

  it('deletes entry with -d offset', async () => {
    const { c } = ctxWithFS(['one', 'two', 'three']);
    const streams = io();
    const code = await historyAsync(['-d', '2'], c, streams);
    expect(code).toBe(0);
    expect(c.history).toEqual(['one', 'three']);
  });

  it('prints args with -p without modifying history', async () => {
    const { c } = ctxWithFS(['orig']);
    const streams = io();
    const code = await historyAsync(['-p', 'alpha', 'beta'], c, streams);
    expect(code).toBe(0);
    expect((streams as any)._stdout.join('')).toBe('alpha<br>beta');
    expect(c.history).toEqual(['orig']);
  });

  it('writes history to file with -w', async () => {
    const { c, fs } = ctxWithFS(['cmd1', 'cmd2']);
    const streams = io();
    const code = await historyAsync(['-w'], c, streams);
    expect(code).toBe(0);
    const node = fs.getNode('/home/busykoala/.bash_history', 'busykoala', 'busygroup', 'read');
    expect(node?.type).toBe('file');
    expect(node?.content).toBe('cmd1\ncmd2');
  });

  it('appends only new entries with -a', async () => {
    const { c, fs } = ctxWithFS(['one', 'two']);
    const streams = io();
    await historyAsync(['-w'], c, streams); // write base
    c.history.push('three', 'four');
    const code = await historyAsync(['-a'], c, streams);
    expect(code).toBe(0);
    const node = fs.getNode('/home/busykoala/.bash_history', 'busykoala', 'busygroup', 'read');
    expect(node?.content).toBe('one\ntwo\nthree\nfour');
  });

  it('reads all history from file with -r', async () => {
    const { c, fs } = ctxWithFS([]);
    const streams = io();
    // prepare file
    fs.addFile(
      '/home/busykoala',
      '.bash_history',
      'busykoala',
      'busygroup',
      'busykoala',
      'busygroup',
      'a\nb',
      'rw-r--r--',
    );
    const code = await historyAsync(['-r'], c, streams);
    expect(code).toBe(0);
    expect(c.history).toEqual(['a', 'b']);
  });

  it('reads only new entries with -n after -r', async () => {
    const { c, fs } = ctxWithFS([]);
    const streams = io();
    fs.addFile(
      '/home/busykoala',
      '.bash_history',
      'busykoala',
      'busygroup',
      'busykoala',
      'busygroup',
      'x\ny',
      'rw-r--r--',
    );
    await historyAsync(['-r'], c, streams);
    // append new lines to file
    fs.addFile(
      '/home/busykoala',
      '.bash_history',
      'busykoala',
      'busygroup',
      'busykoala',
      'busygroup',
      '\nz\nw',
      'rw-r--r--',
      true,
    );
    const code = await historyAsync(['-n'], c, streams);
    expect(code).toBe(0);
    expect(c.history).toEqual(['x', 'y', 'z', 'w']);
  });
});
