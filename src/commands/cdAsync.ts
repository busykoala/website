import { CommandContext } from '../core/TerminalCore';
import { IOStreams } from '../core/streams';
import { parseSimpleFlags } from '../utils/flagParser';
import { resolvePath, expandHome, normalizePath } from '../utils/pathUtils';
import { ExitCode, writeError, commandError } from '../utils/errorMessages';
import { validateDirectory, canExecute } from '../utils/fileValidation';

export async function cdAsync(
  args: string[],
  context: CommandContext,
  io: IOStreams,
): Promise<number> {
  // Help / version
  if (args.includes('--help') || args.includes('-h')) {
    io.stdout.write(cdAsyncCommand.usage || cdAsyncCommand.description || 'cd [directory]');
    return ExitCode.SUCCESS;
  }
  if (args.includes('--version')) {
    io.stdout.write('cd (GNU coreutils simulation) 1.0.0\n');
    return ExitCode.SUCCESS;
  }

  const fs = context.terminal.getFileSystem();
  const { flags, positional } = parseSimpleFlags(args);
  const physicalMode = flags.has('P');

  // ignore --help/--version already handled
  const ops = positional;

  if (ops.length > 1) {
    return writeError(io.stderr, 'cd: too many arguments', ExitCode.GENERAL_ERROR);
  }

  let dest = ops[0];

  // Default to HOME
  if (!dest) {
    const home = context.env.HOME;
    if (!home) {
      return writeError(io.stderr, 'cd: HOME not set', ExitCode.GENERAL_ERROR);
    }
    dest = home;
  }

  // cd - toggles to OLDPWD and prints it
  let shouldPrintPath = false;
  if (dest === '-') {
    const old = context.env.OLDPWD;
    if (!old) {
      return writeError(io.stderr, 'cd: OLDPWD not set', ExitCode.GENERAL_ERROR);
    }
    dest = old;
    shouldPrintPath = true;
  }

  // Tilde expansion
  if (dest.startsWith('~')) {
    if (dest === '~' || dest.startsWith('~/')) {
      dest = expandHome(dest, context.env.HOME || '/');
    } else {
      const m = dest.match(/^~([^/]+)(.*)$/);
      if (m) {
        const user = m[1];
        const rest = m[2] || '';
        dest = `/home/${user}${rest}`; // simple ~user mapping
      }
    }
  }

  // CDPATH search if relative and not starting with '.' or '..'
  let usedCDPath = false;
  const isAbsolute = dest.startsWith('/');
  const isDotRelative = dest.startsWith('./') || dest.startsWith('../');
  if (!isAbsolute && !isDotRelative && context.env.CDPATH) {
    const entries = String(context.env.CDPATH).split(':');
    for (const entry of entries) {
      const base = entry === '' ? context.env.PWD : entry;
      const candidate = resolvePath(dest, base);

      const dirRes = validateDirectory('cd', fs, candidate, '/');
      if (!dirRes.error) {
        // Ensure execute (traverse) permission
        const execRes = canExecute(fs, candidate, '/');
        if (execRes.valid) {
          dest = candidate; // absolute, normalized
          usedCDPath = base !== context.env.PWD; // print only if not from current PWD
          break;
        }
      }
    }
  }

  try {
    // Build logical (non-normalized) candidate by concatenation if relative
    const logicalCandidate = dest.startsWith('/')
      ? dest
      : `${context.env.PWD}${context.env.PWD.endsWith('/') ? '' : '/'}${dest}`;

    // Normalize for actual filesystem checks
    const physicalPath = normalizePath(logicalCandidate);

    // Validate directory exists
    const dirRes = validateDirectory('cd', fs, physicalPath, '/');
    if (dirRes.error) {
      return writeError(io.stderr, dirRes.error, ExitCode.GENERAL_ERROR);
    }

    // Check execute permission
    const execRes = canExecute(fs, physicalPath, '/');
    if (!execRes.valid) {
      return writeError(io.stderr, `cd: '${dest}': Permission denied`, ExitCode.GENERAL_ERROR);
    }

    // Compute new PWD according to mode
    const prev = context.env.PWD;
    const newPWD = physicalMode ? physicalPath : logicalCandidate;

    context.env.OLDPWD = prev;
    context.env.PWD = newPWD;

    if (shouldPrintPath || usedCDPath) {
      io.stdout.write(newPWD);
    }

    return ExitCode.SUCCESS;
  } catch (error) {
    return writeError(
      io.stderr,
      commandError('cd', error instanceof Error ? error.message : 'Unknown error'),
      ExitCode.GENERAL_ERROR,
    );
  }
}

export const cdAsyncCommand = {
  description: 'Change the current directory',
  usage: 'cd [-LP] [directory]',
  execute: cdAsync,
};
