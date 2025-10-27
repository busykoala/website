/**
 * Common command utilities
 * Provides helper functions for standard command behaviors
 */

import { IOStreams } from '../core/streams';
import { ExitCode } from './errorMessages';

/**
 * Check if help flag is present and write help message if so
 * @returns true if help was shown (command should exit)
 */
export function handleHelpFlag(
  args: string[],
  io: IOStreams,
  usage: string,
  includeShortHelp: boolean = true,
): boolean {
  const hasHelp = includeShortHelp
    ? args.includes('--help') || args.includes('-h')
    : args.includes('--help');

  if (hasHelp) {
    io.stdout.write(usage + '\n');
    return true;
  }
  return false;
}

/**
 * Check if version flag is present and write version if so
 * @returns true if version was shown (command should exit)
 */
export function handleVersionFlag(
  args: string[],
  io: IOStreams,
  commandName: string,
  version: string = '1.0.0',
): boolean {
  if (args.includes('--version')) {
    io.stdout.write(`${commandName} (GNU coreutils simulation) ${version}\n`);
    return true;
  }
  return false;
}

/**
 * Handle common flags (--help and --version) in one call
 * @returns exit code if command should exit, null otherwise
 */
export function handleCommonFlags(
  args: string[],
  io: IOStreams,
  commandName: string,
  usage: string,
  includeShortHelp: boolean = true,
  version: string = '1.0.0',
): number | null {
  if (handleHelpFlag(args, io, usage, includeShortHelp)) {
    return ExitCode.SUCCESS;
  }
  if (handleVersionFlag(args, io, commandName, version)) {
    return ExitCode.SUCCESS;
  }
  return null;
}
