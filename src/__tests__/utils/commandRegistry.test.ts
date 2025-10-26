import { describe, it, expect } from 'vitest';
import { Shell } from '../../core/Shell';
import { Renderer } from '../../core/Renderer';
import { FileSystem } from '../../core/filesystem';
import { addBaseFilesystem } from '../../core/addBaseFilesystem';
import type { CommandContext } from '../../core/TerminalCore';
import { registerAllCommands } from '../../utils/commandRegistry';

function createMockRenderer(): Renderer {
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

function createMockContext(): CommandContext {
  const fileSystem = new FileSystem();
  addBaseFilesystem(fileSystem);
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
    terminal: {
      getFileSystem: () => fileSystem,
    } as any,
    shell: null as any,
  };
}

describe('command registry auto-registration', () => {
  it('registers core commands like echo, ls, and cat', async () => {
    const renderer = createMockRenderer();
    const context = createMockContext();
    const shell = new Shell({ renderer, context });
    context.shell = shell as any;

    await registerAllCommands(shell);

    const commands = shell.getCommands();
    const names = Object.keys(commands);
    expect(names).toContain('echo');
    expect(names).toContain('ls');
    expect(names).toContain('cat');
  });
});
