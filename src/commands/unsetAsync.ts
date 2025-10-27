import { CommandContext } from '../core/TerminalCore';
import { IOStreams } from '../core/streams';
import { parseSimpleFlags } from '../utils/flagParser';
import { writeError, ExitCode } from '../utils/errorMessages';

export async function unsetAsync(
  args: string[],
  context: CommandContext,
  io: IOStreams,
): Promise<number> {
  const parsed = parseSimpleFlags(args);

  // Help
  if (parsed.flags.has('h') || parsed.longFlags.has('help')) {
    io.stdout.write(
      unsetAsyncCommand.usage || unsetAsyncCommand.description || 'unset [-v] [-f] NAME...',
    );
    return ExitCode.SUCCESS;
  }

  // Flags: -v (variables), -f (functions). Combined short flags supported by parser
  const flagV = parsed.flags.has('v');
  const flagF = parsed.flags.has('f');
  const names: string[] = [...parsed.positional];

  // If both -v and -f are set, error (cannot unset both types simultaneously)
  if (flagV && flagF) {
    return writeError(
      io.stderr,
      "unset: cannot use both '-f' and '-v' together",
      ExitCode.GENERAL_ERROR,
    );
  }

  if (names.length === 0) {
    return writeError(io.stderr, 'unset: not enough arguments', ExitCode.GENERAL_ERROR);
  }

  // Default behavior without flags: act like -v (variables)
  const mode: 'var' | 'func' = flagF ? 'func' : 'var';

  if (mode === 'func') {
    // No function table in this shell; accept and succeed without effect
    return ExitCode.SUCCESS;
  }

  // mode === 'var'
  for (const key of names) {
    if (key in context.env) delete (context.env as any)[key];
  }
  return ExitCode.SUCCESS;
}

export const unsetAsyncCommand = {
  description: 'Unset values of shell variables and functions',
  usage: 'unset [-v] [-f] NAME...',
  execute: unsetAsync,
};
