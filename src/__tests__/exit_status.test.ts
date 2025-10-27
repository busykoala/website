import { describe, it, expect } from 'vitest';
import { Shell } from '../core/Shell';
import { Renderer } from '../core/Renderer';
import { FileSystem } from '../core/filesystem';
import { addBaseFilesystem } from '../core/addBaseFilesystem';
import type { CommandContext } from '../core/TerminalCore';
import { echoAsync, echoAsyncCommand } from '../commands/echoAsync';

function createMockRenderer(): Renderer {
  // minimal DOM elements
  const output = document.createElement('div');
  const prompt = document.createElement('div');
  const pathSpan = document.createElement('span');
  pathSpan.className = 'prompt-path';
  prompt.appendChild(pathSpan);
  const input = document.createElement('input');
  input.id = 'terminal-input';
  return new Renderer({ outputElement: output, promptElement: prompt, inputElement: input });
}

function createContext(): CommandContext {
  const fs = new FileSystem();
  addBaseFilesystem(fs);
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
    terminal: { getFileSystem: () => fs } as any,
    shell: null as any,
  };
}

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

describe('last exit status ($?) support', () => {
  it('Shell keeps env["?"] updated for success and command-not-found', async () => {
    const renderer = createMockRenderer();
    const context = createContext();
    const shell = new Shell({ renderer, context });
    shell.registerCommand(
      'echo',
      echoAsyncCommand.execute,
      echoAsyncCommand.description,
      echoAsyncCommand.usage,
    );

    await shell.executeCommand('echo ok');
    expect((context.env as any)['?']).toBe('0');

    await shell.executeCommand('idontexist');
    expect((context.env as any)['?']).toBe('127');
  });

  it('echo expands $? to last exit status', async () => {
    const streams = io();
    const ctx = createContext();
    (ctx.env as any)['?'] = '42';
    await echoAsync(['$?'], ctx, streams);
    expect((streams as any)._stdout.join('')).toBe('42\n');

    (ctx.env as any)['?'] = '127';
    const streams2 = io();
    await echoAsync(['$?'], ctx, streams2);
    expect((streams2 as any)._stdout.join('')).toBe('127\n');
  });
});
