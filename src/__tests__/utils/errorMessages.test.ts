import { describe, it, expect } from 'vitest';
import {
  commandError,
  fileError,
  permissionDenied,
  fileNotFound,
  isDirectory,
  notDirectory,
  fileExists,
  invalidOption,
  missingOperand,
  extraOperand,
  usageHint,
  writeError,
  CommandError,
  ExitCode,
} from '../../utils/errorMessages';

describe('utils/errorMessages', () => {
  it('formats common error messages', () => {
    expect(commandError('cmd', 'oops')).toBe('cmd: oops');
    expect(fileError('cp', 'a.txt', 'nope')).toBe("cp: cannot access 'a.txt': nope");
    expect(permissionDenied('cat', 'secret')).toBe("cat: 'secret': Permission denied");
    expect(fileNotFound('ls', 'x')).toBe("ls: cannot access 'x': No such file or directory");
    expect(isDirectory('rm', 'dir')).toBe("rm: 'dir': Is a directory");
    expect(notDirectory('cd', 'file')).toBe("cd: 'file': Not a directory");
    expect(fileExists('touch', 'x')).toBe("touch: cannot create 'x': File exists");
    expect(invalidOption('echo', 'z')).toMatch(/invalid option/);
    expect(missingOperand('rm')).toMatch(/missing operand/);
    expect(extraOperand('mkdir', 'x')).toMatch(/extra operand/);
    expect(usageHint('foo')).toMatch(/Try 'foo --help'/);
  });

  it('writeError writes and returns appropriate exit code', () => {
    let captured = '';
    const stderr = {
      write: (s: string) => {
        captured += s;
      },
    };

    const code1 = writeError(stderr, 'plain error');
    expect(code1).toBe(ExitCode.GENERAL_ERROR);
    expect(captured.endsWith('\n')).toBe(true);
    expect(captured).toContain('plain error');

    captured = '';
    const err = new CommandError('cmd', 'bad args', ExitCode.MISUSE);
    const code2 = writeError(stderr, err);
    expect(code2).toBe(ExitCode.MISUSE);
    expect(captured).toContain('bad args');
  });
});
