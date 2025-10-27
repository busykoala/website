import { describe, it, expect, vi } from 'vitest';
import { Shell } from '../core/Shell';
import { Renderer } from '../core/Renderer';
import { FileSystem } from '../core/filesystem';
import { addBaseFilesystem } from '../core/addBaseFilesystem';
import type { CommandContext } from '../core/TerminalCore';

// Create mock DOM elements
function createMockRenderer(): Renderer {
  const outputEl = document.createElement('div');
  const promptEl = document.createElement('div');
  // mimic prompt structure with a path span and an input placeholder
  const pathSpan = document.createElement('span');
  pathSpan.className = 'prompt-path';
  promptEl.appendChild(pathSpan);
  const inputEl = document.createElement('input');
  inputEl.id = 'terminal-input';
  // the real input will be provided separately, this is just for getPromptHTML clone removal
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

describe('Redirect and Pipe Tests', () => {
  describe('Output redirect (>)', () => {
    it('should write command output to file', async () => {
      const renderer = createMockRenderer();
      const context = createMockContext();
      const shell = new Shell({ renderer, context });

      // Register echo command for testing
      const { echoAsyncCommand } = await import('../commands/echoAsync');
      shell.registerCommand(
        'echo',
        echoAsyncCommand.execute,
        echoAsyncCommand.description,
        echoAsyncCommand.usage,
      );

      await shell.executeCommand('echo "test content" > output.txt');

      // Check file was created
      const fs = context.terminal.getFileSystem();
      const file = fs.getNode('/home/busykoala/output.txt', 'busykoala', 'busygroup', 'read');

      expect(file).toBeTruthy();
      expect(file?.type).toBe('file');
      expect(file?.content).toContain('test content');
    });

    it('should overwrite existing file with >', async () => {
      const renderer = createMockRenderer();
      const context = createMockContext();
      const shell = new Shell({ renderer, context });

      // Create existing file
      const fs = context.terminal.getFileSystem();
      fs.addFile(
        '/home/busykoala',
        'existing.txt',
        'busykoala',
        'busygroup',
        'busykoala',
        'busygroup',
        'old content',
        'rw-r--r--',
      );

      const { echoAsyncCommand } = await import('../commands/echoAsync');
      shell.registerCommand(
        'echo',
        echoAsyncCommand.execute,
        echoAsyncCommand.description,
        echoAsyncCommand.usage,
      );

      await shell.executeCommand('echo "new content" > existing.txt');

      const file = fs.getNode('/home/busykoala/existing.txt', 'busykoala', 'busygroup', 'read');
      expect(file?.content).toContain('new content');
      expect(file?.content).not.toContain('old content');
    });
  });

  describe('Append redirect (>>)', () => {
    it('should append command output to file', async () => {
      const renderer = createMockRenderer();
      const context = createMockContext();
      const shell = new Shell({ renderer, context });

      // Create existing file
      const fs = context.terminal.getFileSystem();
      fs.addFile(
        '/home/busykoala',
        'append.txt',
        'busykoala',
        'busygroup',
        'busykoala',
        'busygroup',
        'line1',
        'rw-r--r--',
      );

      const { echoAsyncCommand } = await import('../commands/echoAsync');
      shell.registerCommand(
        'echo',
        echoAsyncCommand.execute,
        echoAsyncCommand.description,
        echoAsyncCommand.usage,
      );

      await shell.executeCommand('echo "line2" >> append.txt');

      const file = fs.getNode('/home/busykoala/append.txt', 'busykoala', 'busygroup', 'read');
      expect(file?.content).toContain('line1');
      expect(file?.content).toContain('line2');
    });

    it('should create file if it does not exist with >>', async () => {
      const renderer = createMockRenderer();
      const context = createMockContext();
      const shell = new Shell({ renderer, context });

      const { echoAsyncCommand } = await import('../commands/echoAsync');
      shell.registerCommand(
        'echo',
        echoAsyncCommand.execute,
        echoAsyncCommand.description,
        echoAsyncCommand.usage,
      );

      await shell.executeCommand('echo "content" >> newfile.txt');

      const fs = context.terminal.getFileSystem();
      const file = fs.getNode('/home/busykoala/newfile.txt', 'busykoala', 'busygroup', 'read');

      expect(file).toBeTruthy();
      expect(file?.content).toContain('content');
    });
  });

  describe('Command history', () => {
    it('should store commands in history', async () => {
      const renderer = createMockRenderer();
      const context = createMockContext();
      const shell = new Shell({ renderer, context });

      const { echoAsyncCommand } = await import('../commands/echoAsync');
      shell.registerCommand(
        'echo',
        echoAsyncCommand.execute,
        echoAsyncCommand.description,
        echoAsyncCommand.usage,
      );

      await shell.executeCommand('echo test1');
      await shell.executeCommand('echo test2');
      await shell.executeCommand('echo test3');

      expect(context.history).toHaveLength(3);
      expect(context.history[0]).toBe('echo test1');
      expect(context.history[1]).toBe('echo test2');
      expect(context.history[2]).toBe('echo test3');
    });

    it('should navigate history with up/down', async () => {
      const renderer = createMockRenderer();
      const context = createMockContext();
      const shell = new Shell({ renderer, context });

      // Set history on shell itself
      (shell as any).history = ['cmd1', 'cmd2', 'cmd3'];
      (shell as any).historyIndex = 3;

      // Navigate up
      const cmd1 = shell.navigateHistory('up');
      expect(cmd1).toBe('cmd3');

      const cmd2 = shell.navigateHistory('up');
      expect(cmd2).toBe('cmd2');

      const cmd3 = shell.navigateHistory('up');
      expect(cmd3).toBe('cmd1');

      // Navigate down
      const cmd4 = shell.navigateHistory('down');
      expect(cmd4).toBe('cmd2');

      const cmd5 = shell.navigateHistory('down');
      expect(cmd5).toBe('cmd3');

      const cmd6 = shell.navigateHistory('down');
      expect(cmd6).toBe('');
    });
  });

  describe('Tab completion', () => {
    it('should complete command names', async () => {
      const renderer = createMockRenderer();
      const context = createMockContext();
      const shell = new Shell({ renderer, context });

      const { echoAsyncCommand } = await import('../commands/echoAsync');
      shell.registerCommand(
        'echo',
        echoAsyncCommand.execute,
        echoAsyncCommand.description,
        echoAsyncCommand.usage,
      );
      shell.registerCommand('env', echoAsyncCommand.execute, 'test', 'test'); // Dummy

      const completed = shell.tabComplete('ec');
      expect(completed).toBe('echo ');
    });

    it('should complete file names', async () => {
      const renderer = createMockRenderer();
      const context = createMockContext();
      const shell = new Shell({ renderer, context });

      // Add test files
      const fs = context.terminal.getFileSystem();
      fs.addFile(
        '/home/busykoala',
        'testfile.txt',
        'busykoala',
        'busygroup',
        'busykoala',
        'busygroup',
        '',
        'rw-r--r--',
      );

      const { catAsyncCommand } = await import('../commands/catAsync');
      shell.registerCommand(
        'cat',
        catAsyncCommand.execute,
        catAsyncCommand.description,
        catAsyncCommand.usage,
      );

      const completed = shell.tabComplete('cat test');
      expect(completed).toBe('cat testfile.txt');
    });

    it('should complete directory names with /', async () => {
      const renderer = createMockRenderer();
      const context = createMockContext();
      const shell = new Shell({ renderer, context });

      const { cdAsyncCommand } = await import('../commands/cdAsync');
      shell.registerCommand(
        'cd',
        cdAsyncCommand.execute,
        cdAsyncCommand.description,
        cdAsyncCommand.usage,
      );

      const completed = shell.tabComplete('cd ab');
      expect(completed).toBe('cd about/');
    });

    it('completes flags for commands (ls) and cycles on repeated Tab', async () => {
      const renderer = createMockRenderer();
      const context = createMockContext();
      const shell = new Shell({ renderer, context });

      const { lsAsyncCommand } = await import('../commands/lsAsync');
      shell.registerCommand(
        'ls',
        lsAsyncCommand.execute,
        lsAsyncCommand.description,
        lsAsyncCommand.usage,
      );

      // Initial completion for short flags
      let completed = shell.tabComplete('ls -');
      expect(completed).toBe('ls -A ');
      // Cycle to next candidate on repeated Tab
      completed = shell.tabComplete('ls -');
      expect(completed).toBe('ls -a ');

      // Long option completion
      completed = shell.tabComplete('ls --co');
      expect(completed).toBe('ls --color=auto ');
    });

    it('completes subcommands for help COMMAND', async () => {
      const renderer = createMockRenderer();
      const context = createMockContext();
      const shell = new Shell({ renderer, context });

      const { echoAsyncCommand } = await import('../commands/echoAsync');
      const { envAsync } = await import('../commands/envAsync');
      const { helpAsync } = await import('../commands/helpAsync');

      shell.registerCommand(
        'echo',
        echoAsyncCommand.execute,
        echoAsyncCommand.description,
        echoAsyncCommand.usage,
      );
      shell.registerCommand('env', envAsync, 'Env', 'env [OPTIONS]');
      shell.registerCommand('help', helpAsync, 'Help', 'help [COMMAND]');

      const completed = shell.tabComplete('help ec');
      expect(completed).toBe('help echo ');
    });
  });

  describe('Reverse i-search', () => {
    it('shows hint on start and updates on typing, cycles with next, aborts and accepts correctly', async () => {
      const renderer = createMockRenderer();
      const context = createMockContext();
      const shell = new Shell({ renderer, context });

      // Seed history directly
      (shell as any).history = ['echo foo', 'ls', 'echo bar foo'];
      (shell as any).historyIndex = 3;

      // Spy on hint rendering to validate calls
      const hintSpy = vi.spyOn(renderer as any, 'showReverseSearchHint');

      // Start
      shell.startReverseSearch();
      expect(shell.isReverseSearchActive()).toBe(true);
      expect(hintSpy).toHaveBeenLastCalledWith('', null);

      // Type query 'foo' -> should match most recent 'echo bar foo'
      shell.typeReverseSearchChar('f');
      shell.typeReverseSearchChar('o');
      shell.typeReverseSearchChar('o');
      expect(hintSpy).toHaveBeenLastCalledWith('foo', 'echo bar foo');
      expect(renderer.getInputValue()).toBe('echo bar foo');

      // Next (Ctrl+R) should move to earlier match 'echo foo'
      shell.nextReverseSearch();
      expect(hintSpy).toHaveBeenLastCalledWith('foo', 'echo foo');
      expect(renderer.getInputValue()).toBe('echo foo');

      // Next again wraps back to latest
      shell.nextReverseSearch();
      expect(hintSpy).toHaveBeenLastCalledWith('foo', 'echo bar foo');
      expect(renderer.getInputValue()).toBe('echo bar foo');

      // Abort should clear and reset input
      shell.abortReverseSearch();
      expect(shell.isReverseSearchActive()).toBe(false);
      expect(renderer.getInputValue()).toBe('');

      // Accept keeps input and exits
      shell.startReverseSearch();
      shell.typeReverseSearchChar('l'); // matches 'ls'
      expect(renderer.getInputValue()).toBe('ls');
      shell.acceptReverseSearch();
      expect(shell.isReverseSearchActive()).toBe(false);
      expect(renderer.getInputValue()).toBe('ls');
    });
  });
});

describe('Quoting, env expansion, and globbing via Shell parser', () => {
  it('expands env variables for non-echo commands (cat)', async () => {
    const renderer = createMockRenderer();
    const context = createMockContext();
    const shell = new Shell({ renderer, context });
    const fs = context.terminal.getFileSystem();

    // Create a file at $HOME/hello.txt
    fs.addFile(
      '/home/busykoala',
      'hello.txt',
      'busykoala',
      'busygroup',
      'busykoala',
      'busygroup',
      'hi\n',
      'rw-r--r--',
    );

    const { catAsyncCommand } = await import('../commands/catAsync');
    shell.registerCommand(
      'cat',
      catAsyncCommand.execute,
      catAsyncCommand.description,
      catAsyncCommand.usage,
    );

    await shell.executeCommand('cat "$HOME/hello.txt" > out.txt');
    const out = fs.getNode('/home/busykoala/out.txt', 'busykoala', 'busygroup', 'read') as any;
    expect(out).toBeTruthy();
    expect(out.content).toBe('hi\n');
  });

  it('does not expand variables inside single quotes for non-echo commands', async () => {
    const renderer = createMockRenderer();
    const context = createMockContext();
    const shell = new Shell({ renderer, context });
    const fs = context.terminal.getFileSystem();

    const { catAsyncCommand } = await import('../commands/catAsync');
    shell.registerCommand(
      'cat',
      catAsyncCommand.execute,
      catAsyncCommand.description,
      catAsyncCommand.usage,
    );

    await shell.executeCommand("cat '$HOME/hello.txt' 2> err.txt");
    const err = fs.getNode('/home/busykoala/err.txt', 'busykoala', 'busygroup', 'read') as any;
    expect(err).toBeTruthy();
    expect(String(err.content).toLowerCase()).toContain('no such file');
  });

  it('expands unquoted globs on the last path segment and sorts results', async () => {
    const renderer = createMockRenderer();
    const context = createMockContext();
    const shell = new Shell({ renderer, context });
    const fs = context.terminal.getFileSystem();

    fs.addFile(
      '/home/busykoala',
      'ga.txt',
      'busykoala',
      'busygroup',
      'busykoala',
      'busygroup',
      'A\n',
      'rw-r--r--',
    );
    fs.addFile(
      '/home/busykoala',
      'gb.txt',
      'busykoala',
      'busygroup',
      'busykoala',
      'busygroup',
      'B\n',
      'rw-r--r--',
    );

    const { catAsyncCommand } = await import('../commands/catAsync');
    shell.registerCommand(
      'cat',
      catAsyncCommand.execute,
      catAsyncCommand.description,
      catAsyncCommand.usage,
    );

    await shell.executeCommand('cat g*.txt > out.txt');
    const out = fs.getNode('/home/busykoala/out.txt', 'busykoala', 'busygroup', 'read') as any;
    expect(out.content).toBe('A\nB\n'); // lexicographic order
  });

  it('does not expand quoted globs', async () => {
    const renderer = createMockRenderer();
    const context = createMockContext();
    const shell = new Shell({ renderer, context });
    const fs = context.terminal.getFileSystem();

    const { catAsyncCommand } = await import('../commands/catAsync');
    shell.registerCommand(
      'cat',
      catAsyncCommand.execute,
      catAsyncCommand.description,
      catAsyncCommand.usage,
    );

    await shell.executeCommand('cat "g*.txt" 2> err.txt');
    const err = fs.getNode('/home/busykoala/err.txt', 'busykoala', 'busygroup', 'read') as any;
    expect(String(err.content).toLowerCase()).toContain('no such file');
  });

  it('leaves unmatched globs literal (causes file open error)', async () => {
    const renderer = createMockRenderer();
    const context = createMockContext();
    const shell = new Shell({ renderer, context });
    const fs = context.terminal.getFileSystem();

    const { catAsyncCommand } = await import('../commands/catAsync');
    shell.registerCommand(
      'cat',
      catAsyncCommand.execute,
      catAsyncCommand.description,
      catAsyncCommand.usage,
    );

    await shell.executeCommand('cat nope*.zzz 2> err.txt');
    const err = fs.getNode('/home/busykoala/err.txt', 'busykoala', 'busygroup', 'read') as any;
    expect(String(err.content).toLowerCase()).toContain('no such file');
  });

  it('does not expand globs in directory part (treated literal)', async () => {
    const renderer = createMockRenderer();
    const context = createMockContext();
    const shell = new Shell({ renderer, context });
    const fs = context.terminal.getFileSystem();

    const { catAsyncCommand } = await import('../commands/catAsync');
    shell.registerCommand(
      'cat',
      catAsyncCommand.execute,
      catAsyncCommand.description,
      catAsyncCommand.usage,
    );

    await shell.executeCommand('cat ab*/index.html 2> err.txt');
    const err = fs.getNode('/home/busykoala/err.txt', 'busykoala', 'busygroup', 'read') as any;
    expect(String(err.content).toLowerCase()).toContain('no such file');
  });
});

describe('Here-string expansion and quoting', () => {
  it('expands variables in here-string WORD (double-quoted)', async () => {
    const renderer = createMockRenderer();
    const context = createMockContext();
    const shell = new Shell({ renderer, context });
    const { catAsyncCommand } = await import('../commands/catAsync');
    shell.registerCommand(
      'cat',
      catAsyncCommand.execute,
      catAsyncCommand.description,
      catAsyncCommand.usage,
    );

    await shell.executeCommand('cat <<< "$USER" > out.txt');
    const fs = context.terminal.getFileSystem();
    const node = fs.getNode('/home/busykoala/out.txt', 'busykoala', 'busygroup', 'read') as any;
    expect(node.content).toBe('busykoala\n');
  });

  it('does not expand variables in single-quoted here-string WORD', async () => {
    const renderer = createMockRenderer();
    const context = createMockContext();
    const shell = new Shell({ renderer, context });
    const { catAsyncCommand } = await import('../commands/catAsync');
    shell.registerCommand(
      'cat',
      catAsyncCommand.execute,
      catAsyncCommand.description,
      catAsyncCommand.usage,
    );

    await shell.executeCommand("cat <<< '$USER' > out.txt");
    const fs = context.terminal.getFileSystem();
    const node = fs.getNode('/home/busykoala/out.txt', 'busykoala', 'busygroup', 'read') as any;
    expect(node.content).toBe('$USER\n');
  });
});

describe('Redirection path expansion and special files', () => {
  it('expands env in stdout redirection target', async () => {
    const renderer = createMockRenderer();
    const context = createMockContext();
    const shell = new Shell({ renderer, context });
    const { echoAsyncCommand } = await import('../commands/echoAsync');
    shell.registerCommand(
      'echo',
      echoAsyncCommand.execute,
      echoAsyncCommand.description,
      echoAsyncCommand.usage,
    );

    await shell.executeCommand('echo hi > "$HOME/ro.txt"');
    const fs = context.terminal.getFileSystem();
    const node = fs.getNode('/home/busykoala/ro.txt', 'busykoala', 'busygroup', 'read') as any;
    expect(node.content).toBe('hi\n');
  });

  it('expands env in stderr redirection target', async () => {
    const renderer = createMockRenderer();
    const context = createMockContext();
    const shell = new Shell({ renderer, context });
    const { catAsyncCommand } = await import('../commands/catAsync');
    shell.registerCommand(
      'cat',
      catAsyncCommand.execute,
      catAsyncCommand.description,
      catAsyncCommand.usage,
    );

    await shell.executeCommand('cat nope 2> "$HOME/err2.txt"');
    const fs = context.terminal.getFileSystem();
    const node = fs.getNode('/home/busykoala/err2.txt', 'busykoala', 'busygroup', 'read') as any;
    expect(String(node.content).toLowerCase()).toContain('no such file');
  });

  it('treats /dev/null specially even when quoted for stderr', async () => {
    const renderer = createMockRenderer();
    const context = createMockContext();
    const shell = new Shell({ renderer, context });
    const { catAsyncCommand } = await import('../commands/catAsync');
    shell.registerCommand(
      'cat',
      catAsyncCommand.execute,
      catAsyncCommand.description,
      catAsyncCommand.usage,
    );

    await shell.executeCommand('cat nope 2> "/dev/null"');
    const fs = context.terminal.getFileSystem();
    let errNode: any = null;
    try {
      errNode = fs.getNode('/home/busykoala/err.txt', 'busykoala', 'busygroup', 'read');
    } catch {}
    expect(errNode).toBeNull();
    const devNull = fs.getNode('/dev/null', 'busykoala', 'busygroup', 'read') as any;
    expect(devNull.content).toBe('');
  });
});

describe('Pipeline with quoting', () => {
  it('passes quoted previous output as single argument to next command', async () => {
    const renderer = createMockRenderer();
    const context = createMockContext();
    const shell = new Shell({ renderer, context });

    const { echoAsyncCommand } = await import('../commands/echoAsync');
    shell.registerCommand(
      'echo',
      echoAsyncCommand.execute,
      echoAsyncCommand.description,
      echoAsyncCommand.usage,
    );

    await shell.executeCommand('echo "a b" | echo > out.txt');
    const fs = context.terminal.getFileSystem();
    const node = fs.getNode('/home/busykoala/out.txt', 'busykoala', 'busygroup', 'read') as any;
    expect(node.content).toBe('a b\n');
  });
});

describe('Additional parsing edge cases', () => {
  it('treats escaped spaces as part of a single unquoted arg', async () => {
    const renderer = createMockRenderer();
    const context = createMockContext();
    const shell = new Shell({ renderer, context });
    const fs = context.terminal.getFileSystem();
    fs.addFile(
      '/home/busykoala',
      'foo bar.txt',
      'busykoala',
      'busygroup',
      'busykoala',
      'busygroup',
      'X\n',
      'rw-r--r--',
    );
    const { catAsyncCommand } = await import('../commands/catAsync');
    shell.registerCommand(
      'cat',
      catAsyncCommand.execute,
      catAsyncCommand.description,
      catAsyncCommand.usage,
    );
    await shell.executeCommand('cat foo\\ bar.txt > out_space.txt');
    const out = fs.getNode(
      '/home/busykoala/out_space.txt',
      'busykoala',
      'busygroup',
      'read',
    ) as any;
    expect(out.content).toBe('X\n');
  });

  it('double-quoted escaped dollar in here-string stays literal', async () => {
    const renderer = createMockRenderer();
    const context = createMockContext();
    const shell = new Shell({ renderer, context });
    const { catAsyncCommand } = await import('../commands/catAsync');
    shell.registerCommand(
      'cat',
      catAsyncCommand.execute,
      catAsyncCommand.description,
      catAsyncCommand.usage,
    );
    await shell.executeCommand('cat <<< "\\$USER" > out_dq_esc.txt');
    const fs = context.terminal.getFileSystem();
    const n = fs.getNode('/home/busykoala/out_dq_esc.txt', 'busykoala', 'busygroup', 'read') as any;
    expect(n.content).toBe('$USER\n');
  });

  it('only the first here-string in a command is used', async () => {
    const renderer = createMockRenderer();
    const context = createMockContext();
    const shell = new Shell({ renderer, context });
    const { catAsyncCommand } = await import('../commands/catAsync');
    shell.registerCommand(
      'cat',
      catAsyncCommand.execute,
      catAsyncCommand.description,
      catAsyncCommand.usage,
    );
    await shell.executeCommand('cat <<< "one" <<< "two" > out_here_first.txt');
    const fs = context.terminal.getFileSystem();
    const n = fs.getNode(
      '/home/busykoala/out_here_first.txt',
      'busykoala',
      'busygroup',
      'read',
    ) as any;
    expect(n.content).toBe('one\n');
  });

  it('globbing with ? matches single character and sorts', async () => {
    const renderer = createMockRenderer();
    const context = createMockContext();
    const shell = new Shell({ renderer, context });
    const fs = context.terminal.getFileSystem();
    fs.addFile(
      '/home/busykoala',
      'g1.txt',
      'busykoala',
      'busygroup',
      'busykoala',
      'busygroup',
      '1\n',
      'rw-r--r--',
    );
    fs.addFile(
      '/home/busykoala',
      'g2.txt',
      'busykoala',
      'busygroup',
      'busykoala',
      'busygroup',
      '2\n',
      'rw-r--r--',
    );
    const { catAsyncCommand } = await import('../commands/catAsync');
    shell.registerCommand(
      'cat',
      catAsyncCommand.execute,
      catAsyncCommand.description,
      catAsyncCommand.usage,
    );
    await shell.executeCommand('cat g?.txt > out_qmark.txt');
    const out = fs.getNode(
      '/home/busykoala/out_qmark.txt',
      'busykoala',
      'busygroup',
      'read',
    ) as any;
    expect(out.content).toBe('1\n2\n');
  });

  it('does not expand globs inside double quotes even if $HOME expands', async () => {
    const renderer = createMockRenderer();
    const context = createMockContext();
    const shell = new Shell({ renderer, context });
    const { catAsyncCommand } = await import('../commands/catAsync');
    shell.registerCommand(
      'cat',
      catAsyncCommand.execute,
      catAsyncCommand.description,
      catAsyncCommand.usage,
    );
    await shell.executeCommand('cat "$HOME/g*.txt" 2> err_glob_dq.txt');
    const fs = context.terminal.getFileSystem();
    const err = fs.getNode(
      '/home/busykoala/err_glob_dq.txt',
      'busykoala',
      'busygroup',
      'read',
    ) as any;
    expect(String(err.content).toLowerCase()).toContain('no such file');
  });

  it('redirects stdout to quoted /dev/null (discards output)', async () => {
    const renderer = createMockRenderer();
    const context = createMockContext();
    const shell = new Shell({ renderer, context });
    const { echoAsyncCommand } = await import('../commands/echoAsync');
    shell.registerCommand(
      'echo',
      echoAsyncCommand.execute,
      echoAsyncCommand.description,
      echoAsyncCommand.usage,
    );
    await shell.executeCommand('echo hi > "/dev/null"');
    const fs = context.terminal.getFileSystem();
    // ensure no stray file was created and /dev/null unchanged
    let stray: any = null;
    try {
      stray = fs.getNode('/home/busykoala/\"/dev/null\"', 'busykoala', 'busygroup', 'read');
    } catch {}
    expect(stray).toBeNull();
    const devNull = fs.getNode('/dev/null', 'busykoala', 'busygroup', 'read') as any;
    expect(devNull.content).toBe('');
  });

  it('expands $? for non-echo commands in here-string', async () => {
    const renderer = createMockRenderer();
    const context = createMockContext();
    const shell = new Shell({ renderer, context });
    (context.env as any)['?'] = '7';
    const { catAsyncCommand } = await import('../commands/catAsync');
    shell.registerCommand(
      'cat',
      catAsyncCommand.execute,
      catAsyncCommand.description,
      catAsyncCommand.usage,
    );
    await shell.executeCommand('cat <<< "$?" > out_status.txt');
    const fs = context.terminal.getFileSystem();
    const n = fs.getNode('/home/busykoala/out_status.txt', 'busykoala', 'busygroup', 'read') as any;
    expect(n.content).toBe('7\n');
  });
});
