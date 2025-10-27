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
  const inputPlaceholder = document.createElement('input');
  inputPlaceholder.id = 'terminal-input';
  promptEl.appendChild(inputPlaceholder);
  const inputEl = document.createElement('input') as HTMLInputElement;
  return new Renderer({ outputElement: outputEl, promptElement: promptEl, inputElement: inputEl });
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

describe('Signal handling: Ctrl+C', () => {
  it('cancels a running long-lived command (tail -f) and sets exit code 130', async () => {
    const renderer = createRenderer();
    const context = createContext();
    const shell = new Shell({ renderer, context });

    // Register tail
    const { tailAsyncCommand } = await import('../commands/tailAsync');
    shell.registerCommand(
      'tail',
      tailAsyncCommand.execute,
      tailAsyncCommand.description,
      tailAsyncCommand.usage,
    );

    // Prepare file to follow
    const fs = context.terminal.getFileSystem();
    fs.addFile(
      '/home/busykoala',
      'follow.txt',
      'busykoala',
      'busygroup',
      'busykoala',
      'busygroup',
      'start\n',
      'rw-r--r--',
    );

    // Start long-running command
    const p = shell.executeCommand('tail -f -s 0.01 follow.txt');

    // Cancel shortly after
    await new Promise((res) => setTimeout(res, 15));
    shell.cancelCurrentExecution();

    await p;
    expect(context.env.LAST_EXIT_CODE).toBe('130');
    expect((context.env as any)['?']).toBe('130');
  });

  it('prints ^C and clears input when idle', async () => {
    const renderer = createRenderer();
    const context = createContext();
    const shell = new Shell({ renderer, context });

    // Simulate user typed something
    renderer.setInputValue('echo something');
    shell.cancelCurrentExecution();

    // Should not throw and should reset input
    expect(renderer.getInputValue()).toBe('');
  });
});
