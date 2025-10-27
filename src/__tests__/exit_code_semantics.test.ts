import { describe, it, expect } from 'vitest';
import { Shell } from '../core/Shell';
import { Renderer } from '../core/Renderer';
import { FileSystem } from '../core/filesystem';
import { addBaseFilesystem } from '../core/addBaseFilesystem';
import type { CommandContext } from '../core/TerminalCore';

function createRenderer(): Renderer {
  const outputEl = document.createElement('div');
  const promptEl = document.createElement('div');
  const pathSpan = document.createElement('span');
  pathSpan.className = 'prompt-path';
  promptEl.appendChild(pathSpan);
  const inputEl = document.createElement('input');
  inputEl.id = 'terminal-input';
  promptEl.appendChild(inputEl);
  const realInputEl = document.createElement('input') as HTMLInputElement;
  return new Renderer({
    outputElement: outputEl,
    promptElement: promptEl,
    inputElement: realInputEl,
  });
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

describe('LAST_EXIT_CODE and $? semantics across pipelines and redirects', () => {
  it('uses exit code of the last command in a pipeline', async () => {
    const renderer = createRenderer();
    const context = createContext();
    const shell = new Shell({ renderer, context });

    const { echoAsyncCommand } = await import('../commands/echoAsync');
    const { catAsyncCommand } = await import('../commands/catAsync');
    shell.registerCommand(
      'echo',
      echoAsyncCommand.execute,
      echoAsyncCommand.description,
      echoAsyncCommand.usage,
    );
    shell.registerCommand(
      'cat',
      catAsyncCommand.execute,
      catAsyncCommand.description,
      catAsyncCommand.usage,
    );

    // First command fails, last succeeds -> overall 0
    await shell.executeCommand('cat nope.txt | echo ok > out.txt');
    expect(context.env.LAST_EXIT_CODE).toBe('0');
    expect((context.env as any)['?']).toBe('0');

    const fs = context.terminal.getFileSystem();
    const out = fs.getNode('/home/busykoala/out.txt', 'busykoala', 'busygroup', 'read') as any;
    expect(String(out.content)).toBe('ok\n');
  });

  it('preserves non-zero exit code for failing last command with stdout+stderr redirect', async () => {
    const renderer = createRenderer();
    const context = createContext();
    const shell = new Shell({ renderer, context });

    const { catAsyncCommand } = await import('../commands/catAsync');
    shell.registerCommand(
      'cat',
      catAsyncCommand.execute,
      catAsyncCommand.description,
      catAsyncCommand.usage,
    );

    await shell.executeCommand('cat nope.txt > out.txt 2>&1');

    expect(context.env.LAST_EXIT_CODE).toBe('1');
    expect((context.env as any)['?']).toBe('1');

    const fs = context.terminal.getFileSystem();
    const out = fs.getNode('/home/busykoala/out.txt', 'busykoala', 'busygroup', 'read') as any;
    expect(String(out.content).toLowerCase()).toContain('no such file');
  });

  it('sets 126 and $?=126 for not executable script', async () => {
    const renderer = createRenderer();
    const context = createContext();
    const shell = new Shell({ renderer, context });
    const fs = context.terminal.getFileSystem();

    fs.addFile(
      '/home/busykoala',
      'nx.sh',
      'busykoala',
      'busygroup',
      'busykoala',
      'busygroup',
      '#!/bin/sh\necho nope\n',
      'rw-r--r--',
    );

    await shell.executeCommand('./nx.sh 2> err.txt');

    expect(context.env.LAST_EXIT_CODE).toBe('126');
    expect((context.env as any)['?']).toBe('126');
  });

  it('sets 0 and $?=0 for successful shebang script', async () => {
    const renderer = createRenderer();
    const context = createContext();
    const shell = new Shell({ renderer, context });
    const fs = context.terminal.getFileSystem();

    fs.addFile(
      '/home/busykoala',
      'ok.sh',
      'busykoala',
      'busygroup',
      'busykoala',
      'busygroup',
      '#!/bin/sh\necho hi\n',
      'rwxr-xr-x',
    );

    await shell.executeCommand('./ok.sh > out.txt');

    expect(context.env.LAST_EXIT_CODE).toBe('0');
    expect((context.env as any)['?']).toBe('0');
  });
});
