/**
 * Standardized POSIX-style error messages
 * Ensures consistent error formatting across all commands
 */

/**
 * Standard error categories with exit codes
 */
export const ExitCode = {
  SUCCESS: 0,
  GENERAL_ERROR: 1,
  MISUSE: 2,
  CANNOT_EXECUTE: 126,
  NOT_FOUND: 127,
  INVALID_EXIT: 128,
} as const;

/**
 * Base error class for command errors
 */
export class CommandError extends Error {
  constructor(
    public readonly command: string,
    message: string,
    public readonly exitCode: number = ExitCode.GENERAL_ERROR,
  ) {
    super(message);
    this.name = 'CommandError';
  }

  toString(): string {
    return `${this.command}: ${this.message}`;
  }
}

/**
 * File not found error
 */
export class FileNotFoundError extends CommandError {
  constructor(command: string, path: string) {
    super(command, `cannot access '${path}': No such file or directory`, ExitCode.GENERAL_ERROR);
    this.name = 'FileNotFoundError';
  }
}

/**
 * Permission denied error
 */
export class PermissionDeniedError extends CommandError {
  constructor(command: string, path: string, operation: string = 'access') {
    super(command, `cannot ${operation} '${path}': Permission denied`, ExitCode.GENERAL_ERROR);
    this.name = 'PermissionDeniedError';
  }
}

/**
 * Is a directory error
 */
export class IsDirectoryError extends CommandError {
  constructor(command: string, path: string) {
    super(command, `'${path}': Is a directory`, ExitCode.GENERAL_ERROR);
    this.name = 'IsDirectoryError';
  }
}

/**
 * Not a directory error
 */
export class NotDirectoryError extends CommandError {
  constructor(command: string, path: string) {
    super(command, `'${path}': Not a directory`, ExitCode.GENERAL_ERROR);
    this.name = 'NotDirectoryError';
  }
}

/**
 * File exists error
 */
export class FileExistsError extends CommandError {
  constructor(command: string, path: string) {
    super(command, `cannot create '${path}': File exists`, ExitCode.GENERAL_ERROR);
    this.name = 'FileExistsError';
  }
}

/**
 * Invalid argument error
 */
export class InvalidArgumentError extends CommandError {
  constructor(command: string, argument: string, reason?: string) {
    const msg = reason
      ? `invalid argument '${argument}': ${reason}`
      : `invalid argument: ${argument}`;
    super(command, msg, ExitCode.MISUSE);
    this.name = 'InvalidArgumentError';
  }
}

/**
 * Missing operand error
 */
export class MissingOperandError extends CommandError {
  constructor(command: string) {
    super(command, 'missing operand', ExitCode.MISUSE);
    this.name = 'MissingOperandError';
  }
}

/**
 * Format a generic command error message
 */
export function commandError(cmd: string, message: string): string {
  return `${cmd}: ${message}`;
}

/**
 * Format a file-related error message
 */
export function fileError(cmd: string, path: string, error: string): string {
  return `${cmd}: cannot access '${path}': ${error}`;
}

/**
 * Format a permission denied error
 */
export function permissionDenied(cmd: string, path: string): string {
  return `${cmd}: '${path}': Permission denied`;
}

/**
 * Format a file not found error
 */
export function fileNotFound(cmd: string, path: string): string {
  return `${cmd}: cannot access '${path}': No such file or directory`;
}

/**
 * Format an is-a-directory error
 */
export function isDirectory(cmd: string, path: string): string {
  return `${cmd}: '${path}': Is a directory`;
}

/**
 * Format a not-a-directory error
 */
export function notDirectory(cmd: string, path: string): string {
  return `${cmd}: '${path}': Not a directory`;
}

/**
 * Format a file exists error
 */
export function fileExists(cmd: string, path: string): string {
  return `${cmd}: cannot create '${path}': File exists`;
}

/**
 * Format an invalid option error
 */
export function invalidOption(cmd: string, option: string): string {
  return `${cmd}: invalid option -- '${option}'\nTry '${cmd} --help' for more information.`;
}

/**
 * Format a missing operand error
 */
export function missingOperand(cmd: string, after?: string): string {
  if (after) {
    return `${cmd}: missing operand after '${after}'\nTry '${cmd} --help' for more information.`;
  }
  return `${cmd}: missing operand\nTry '${cmd} --help' for more information.`;
}

/**
 * Format an extra operand error
 */
export function extraOperand(cmd: string, operand: string): string {
  return `${cmd}: extra operand '${operand}'\nTry '${cmd} --help' for more information.`;
}

/**
 * Format a usage hint
 */
export function usageHint(cmd: string): string {
  return `Try '${cmd} --help' for more information.`;
}

/**
 * Write error message to stderr and return exit code
 */
export function writeError(
  stderr: { write: (msg: string) => void },
  error: Error | string,
  exitCode: number = ExitCode.GENERAL_ERROR,
): number {
  const message = error instanceof Error ? error.message : error;
  stderr.write(message + (message.endsWith('\n') ? '' : '\n'));

  if (error instanceof CommandError) {
    return error.exitCode;
  }

  return exitCode;
}

/**
 * Format a "cannot open '<path>' for reading: <reason>" error
 */
export function cannotOpenForReading(cmd: string, path: string, reason: string): string {
  return `${cmd}: cannot open '${path}' for reading: ${reason}`;
}
