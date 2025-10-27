import { describe, it, expect } from 'vitest';
import { Shell } from '../core/Shell';
import { Renderer } from '../core/Renderer';
import { FileSystem } from '../core/filesystem';
import { addBaseFilesystem } from '../core/addBaseFilesystem';
import type { CommandContext } from '../core/TerminalCore';
import { registerAllCommands } from '../utils/commandRegistry';

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
      PATH: '/bin:/usr/bin',
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

describe('Shell + CommandResolver + InterpreterRegistry', () => {
  it('executes a mapped builtin via absolute path (/bin/echo)', async () => {
    const renderer = createRenderer();
    const context = createContext();
    const shell = new Shell({ renderer, context });

    // Register echo so resolver maps /bin/echo and /usr/bin/echo
    const { echoAsyncCommand } = await import('../commands/echoAsync');
    shell.registerCommand(
      'echo',
      echoAsyncCommand.execute,
      echoAsyncCommand.description,
      echoAsyncCommand.usage,
    );

    await shell.executeCommand('/bin/echo hello > out.txt');

    const fs = context.terminal.getFileSystem();
    const file = fs.getNode('/home/busykoala/out.txt', 'busykoala', 'busygroup', 'read') as any;
    expect(file).toBeTruthy();
    expect(file.content).toBe('hello\n');
  });

  it('returns 127 for not found commands', async () => {
    const renderer = createRenderer();
    const context = createContext();
    const shell = new Shell({ renderer, context });

    await shell.executeCommand('doesnotexist 2> err.txt');

    expect(context.env.LAST_EXIT_CODE).toBe('127');
    const fs = context.terminal.getFileSystem();
    const err = fs.getNode('/home/busykoala/err.txt', 'busykoala', 'busygroup', 'read') as any;
    expect(String(err.content)).toMatch(/Command 'doesnotexist' not found/i);
  });

  it('returns 126 for not executable files', async () => {
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
    const err = fs.getNode('/home/busykoala/err.txt', 'busykoala', 'busygroup', 'read') as any;
    expect(String(err.content)).toMatch(/Permission denied/i);
  });

  it('executes shebang scripts with shell interpreter', async () => {
    const renderer = createRenderer();
    const context = createContext();
    const shell = new Shell({ renderer, context });
    await registerAllCommands(shell);
    const fs = context.terminal.getFileSystem();

    fs.addFile(
      '/home/busykoala',
      'hello.sh',
      'busykoala',
      'busygroup',
      'busykoala',
      'busygroup',
      '#!/bin/sh\necho hi\n',
      'rwxr-xr-x',
    );

    await shell.executeCommand('./hello.sh > out.txt');

    const out = fs.getNode('/home/busykoala/out.txt', 'busykoala', 'busygroup', 'read') as any;
    expect(String(out.content)).toBe('hi\n');
  });
});
