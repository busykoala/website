import { describe, it, expect } from 'vitest';
import { echoAsync } from '../../commands/echoAsync';
import type { CommandContext } from '../../core/TerminalCore';
import type { IOStreams } from '../../core/streams';
import { FileSystem } from '../../core/filesystem';
import { addBaseFilesystem } from '../../core/addBaseFilesystem';

// Mock I/O streams
function createMockIO(): IOStreams {
  const stdout: string[] = [];
  const stderr: string[] = [];

  return {
    stdout: {
      write: (data: string) => stdout.push(data),
      on: () => {},
    },
    stderr: {
      write: (data: string) => stderr.push(data),
      on: () => {},
    },
    stdin: {
      read: () => '',
      on: () => {},
    },
    _stdout: stdout,
    _stderr: stderr,
  } as any;
}

// Create mock context
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

describe('echo command - GNU coreutils compliant', () => {
  describe('basic functionality', () => {
    it('should echo simple text with newline', async () => {
      const io = createMockIO();
      const context = createMockContext();

      const exitCode = await echoAsync(['hello', 'world'], context, io);

      expect(exitCode).toBe(0);
      expect((io as any)._stdout.join('')).toBe('hello world\n');
    });

    it('should handle empty args', async () => {
      const io = createMockIO();
      const context = createMockContext();

      const exitCode = await echoAsync([], context, io);

      expect(exitCode).toBe(0);
      expect((io as any)._stdout.join('')).toBe('\n');
    });

    it('should handle single argument', async () => {
      const io = createMockIO();
      const context = createMockContext();

      const exitCode = await echoAsync(['test'], context, io);

      expect(exitCode).toBe(0);
      expect((io as any)._stdout.join('')).toBe('test\n');
    });
  });

  describe('-n flag (no trailing newline)', () => {
    it('should not output newline with -n', async () => {
      const io = createMockIO();
      const context = createMockContext();

      const exitCode = await echoAsync(['-n', 'hello', 'world'], context, io);

      expect(exitCode).toBe(0);
      expect((io as any)._stdout.join('')).toBe('hello world');
    });

    it('should handle -n with single word', async () => {
      const io = createMockIO();
      const context = createMockContext();

      const exitCode = await echoAsync(['-n', 'test'], context, io);

      expect(exitCode).toBe(0);
      expect((io as any)._stdout.join('')).toBe('test');
    });

    it('should handle -n with empty text', async () => {
      const io = createMockIO();
      const context = createMockContext();

      const exitCode = await echoAsync(['-n'], context, io);

      expect(exitCode).toBe(0);
      expect((io as any)._stdout.join('')).toBe('');
    });
  });

  describe('-e flag (enable escape sequences)', () => {
    it('should interpret \\n as newline', async () => {
      const io = createMockIO();
      const context = createMockContext();

      const exitCode = await echoAsync(['-e', 'line1\\nline2'], context, io);

      expect(exitCode).toBe(0);
      expect((io as any)._stdout.join('')).toBe('line1\nline2\n');
    });

    it('should interpret \\t as tab', async () => {
      const io = createMockIO();
      const context = createMockContext();

      const exitCode = await echoAsync(['-e', 'col1\\tcol2'], context, io);

      expect(exitCode).toBe(0);
      expect((io as any)._stdout.join('')).toBe('col1\tcol2\n');
    });

    it('should interpret \\\\ as backslash', async () => {
      const io = createMockIO();
      const context = createMockContext();

      const exitCode = await echoAsync(['-e', 'back\\\\slash'], context, io);

      expect(exitCode).toBe(0);
      expect((io as any)._stdout.join('')).toBe('back\\slash\n');
    });

    it('should interpret \\r as carriage return', async () => {
      const io = createMockIO();
      const context = createMockContext();

      const exitCode = await echoAsync(['-e', 'test\\rtext'], context, io);

      expect(exitCode).toBe(0);
      expect((io as any)._stdout.join('')).toBe('test\rtext\n');
    });

    it('should handle \\c to stop output', async () => {
      const io = createMockIO();
      const context = createMockContext();

      const exitCode = await echoAsync(['-e', 'before\\cafter'], context, io);

      expect(exitCode).toBe(0);
      expect((io as any)._stdout.join('')).toBe('before');
      expect((io as any)._stdout.join('')).not.toContain('after');
      expect((io as any)._stdout.join('')).not.toContain('\n');
    });

    it('should interpret octal sequences', async () => {
      const io = createMockIO();
      const context = createMockContext();

      // \101 = 'A' in octal
      const exitCode = await echoAsync(['-e', '\\101BC'], context, io);

      expect(exitCode).toBe(0);
      expect((io as any)._stdout.join('')).toBe('ABC\n');
    });

    it('should interpret hex sequences', async () => {
      const io = createMockIO();
      const context = createMockContext();

      // \x41 = 'A' in hex
      const exitCode = await echoAsync(['-e', '\\x41BC'], context, io);

      expect(exitCode).toBe(0);
      expect((io as any)._stdout.join('')).toBe('ABC\n');
    });

    it('should handle multiple escape sequences', async () => {
      const io = createMockIO();
      const context = createMockContext();

      const exitCode = await echoAsync(['-e', 'line1\\nline2\\tindented'], context, io);

      expect(exitCode).toBe(0);
      expect((io as any)._stdout.join('')).toBe('line1\nline2\tindented\n');
    });
  });

  describe('-E flag (disable escapes)', () => {
    it('should treat backslashes literally with -E', async () => {
      const io = createMockIO();
      const context = createMockContext();

      const exitCode = await echoAsync(['-E', 'line1\\nline2'], context, io);

      expect(exitCode).toBe(0);
      expect((io as any)._stdout.join('')).toBe('line1\\nline2\n');
    });

    it('should override -e with -E', async () => {
      const io = createMockIO();
      const context = createMockContext();

      const exitCode = await echoAsync(['-e', '-E', 'test\\ntext'], context, io);

      expect(exitCode).toBe(0);
      expect((io as any)._stdout.join('')).toBe('test\\ntext\n');
    });
  });

  describe('flag combinations', () => {
    it('should handle -n and -e together', async () => {
      const io = createMockIO();
      const context = createMockContext();

      const exitCode = await echoAsync(['-n', '-e', 'test\\nline'], context, io);

      expect(exitCode).toBe(0);
      expect((io as any)._stdout.join('')).toBe('test\nline');
    });

    it('should handle -e and -n together', async () => {
      const io = createMockIO();
      const context = createMockContext();

      const exitCode = await echoAsync(['-e', '-n', 'test\\tvalue'], context, io);

      expect(exitCode).toBe(0);
      expect((io as any)._stdout.join('')).toBe('test\tvalue');
    });
  });

  describe('help and version', () => {
    it('should display help with --help', async () => {
      const io = createMockIO();
      const context = createMockContext();

      const exitCode = await echoAsync(['--help'], context, io);

      expect(exitCode).toBe(0);
      const output = (io as any)._stdout.join('');
      expect(output).toContain('Usage');
      expect(output).toContain('-n');
      expect(output).toContain('-e');
    });

    it('should display version with --version', async () => {
      const io = createMockIO();
      const context = createMockContext();

      const exitCode = await echoAsync(['--version'], context, io);

      expect(exitCode).toBe(0);
      const output = (io as any)._stdout.join('');
      expect(output).toContain('echo');
      expect(output).toContain('coreutils');
    });
  });

  describe('edge cases', () => {
    it('should handle text that looks like flags after real flags', async () => {
      const io = createMockIO();
      const context = createMockContext();

      const exitCode = await echoAsync(['-n', '-e', 'this is not a flag'], context, io);

      expect(exitCode).toBe(0);
      expect((io as any)._stdout.join('')).toBe('this is not a flag');
    });

    it('should handle multiple spaces', async () => {
      const io = createMockIO();
      const context = createMockContext();

      const exitCode = await echoAsync(['word1', 'word2', 'word3'], context, io);

      expect(exitCode).toBe(0);
      expect((io as any)._stdout.join('')).toBe('word1 word2 word3\n');
    });
  });

  describe('variable expansion and quoting', () => {
    it('expands $USER unquoted', async () => {
      const io = createMockIO();
      const context = createMockContext();
      const code = await echoAsync(['$USER'], context, io);
      expect(code).toBe(0);
      expect((io as any)._stdout.join('')).toBe('busykoala\n');
    });

    it('expands ${HOME} braced variable', async () => {
      const io = createMockIO();
      const context = createMockContext();
      const code = await echoAsync(['${HOME}'], context, io);
      expect(code).toBe(0);
      expect((io as any)._stdout.join('')).toBe('/home/busykoala\n');
    });

    it('does not expand inside single quotes', async () => {
      const io = createMockIO();
      const context = createMockContext();
      const code = await echoAsync(["'$USER'"], context, io);
      expect(code).toBe(0);
      expect((io as any)._stdout.join('')).toBe('$USER\n');
    });

    it('expands inside double quotes', async () => {
      const io = createMockIO();
      const context = createMockContext();
      const code = await echoAsync(['"$USER"'], context, io);
      expect(code).toBe(0);
      expect((io as any)._stdout.join('')).toBe('busykoala\n');
    });

    it('treats escaped dollar as literal', async () => {
      const io = createMockIO();
      const context = createMockContext();
      const code = await echoAsync(['\\$USER'], context, io);
      expect(code).toBe(0);
      expect((io as any)._stdout.join('')).toBe('$USER\n');
    });

    it('with -e interprets escapes inside double quotes', async () => {
      const io = createMockIO();
      const context = createMockContext();
      const code = await echoAsync(['-e', '"$USER\\nX"'], context, io);
      expect(code).toBe(0);
      expect((io as any)._stdout.join('')).toBe('busykoala\nX\n');
    });
  });

  describe('option parsing edge-cases and combined short options', () => {
    it('supports combined -ne to enable escapes and suppress newline', async () => {
      const io = createMockIO();
      const context = createMockContext();
      const code = await echoAsync(['-ne', 'hi\\n'], context, io);
      expect(code).toBe(0);
      expect((io as any)._stdout.join('')).toBe('hi\n');
    });

    it('supports combined -En to disable escapes and suppress newline', async () => {
      const io = createMockIO();
      const context = createMockContext();
      const code = await echoAsync(['-En', 'a\\nb'], context, io);
      expect(code).toBe(0);
      expect((io as any)._stdout.join('')).toBe('a\\nb');
    });

    it('treats invalid option like -x as operand (no parsing)', async () => {
      const io = createMockIO();
      const context = createMockContext();
      const code = await echoAsync(['-x', 'foo'], context, io);
      expect(code).toBe(0);
      expect((io as any)._stdout.join('')).toBe('-x foo\n');
    });

    it('stops option parsing at first non-option', async () => {
      const io = createMockIO();
      const context = createMockContext();
      const code = await echoAsync(['-n', 'text', '-e', 'foo'], context, io);
      expect(code).toBe(0);
      expect((io as any)._stdout.join('')).toBe('text -e foo');
    });

    it('treats lone -- as operand after options', async () => {
      const io = createMockIO();
      const context = createMockContext();
      const code = await echoAsync(['-n', '--', 'a'], context, io);
      expect(code).toBe(0);
      expect((io as any)._stdout.join('')).toBe('-- a');
    });

    it('does not treat --help as option after operands', async () => {
      const io = createMockIO();
      const context = createMockContext();
      const code = await echoAsync(['foo', '--help'], context, io);
      expect(code).toBe(0);
      expect((io as any)._stdout.join('')).toBe('foo --help\n');
    });

    it('applies last occurrence precedence: -eE disables escapes', async () => {
      const io = createMockIO();
      const context = createMockContext();
      const code = await echoAsync(['-eE', 'x\\n'], context, io);
      expect(code).toBe(0);
      expect((io as any)._stdout.join('')).toBe('x\\n\n');
    });

    it('applies last occurrence precedence: -Ee enables escapes', async () => {
      const io = createMockIO();
      const context = createMockContext();
      const code = await echoAsync(['-Ee', 'x\\n'], context, io);
      expect(code).toBe(0);
      expect((io as any)._stdout.join('')).toBe('x\n\n');
    });
  });
});
