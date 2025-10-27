import { CommandContext } from '../core/TerminalCore';
import { IOStreams } from '../core/streams';
import { parseFlags, FlagDefinition } from '../utils/flagParser';
import { writeError } from '../utils/errorMessages';

const EXPORT_FLAGS: FlagDefinition[] = [
  { short: 'n', long: 'unexport' },
  { short: 'p', long: 'print' },
];

function formatDeclare(env: Record<string, any>): string {
  return Object.entries(env)
    .filter(([k]) => k !== 'COMMANDS')
    .map(([k, v]) => `declare -x ${k}="${String(v)}"`)
    .join('<br>');
}

function formatEnv(env: Record<string, any>): string {
  return Object.entries(env)
    .filter(([key]) => key !== 'COMMANDS')
    .map(([key, value]) => `${key}=${value}`)
    .join('<br>');
}

export async function exportAsync(
  args: string[],
  context: CommandContext,
  io: IOStreams,
): Promise<number> {
  // Help / version
  if (args.includes('--help') || args.includes('-h')) {
    io.stdout.write(
      exportAsyncCommand.usage ||
        exportAsyncCommand.description ||
        'export [-n] [-p] [NAME=VALUE]...',
    );
    return 0;
  }
  if (args.includes('--version')) {
    io.stdout.write('export (GNU coreutils simulation) 1.0.0\n');
    return 0;
  }

  const parsed = parseFlags(args, EXPORT_FLAGS);
  const unexportFlag = Boolean(parsed.flags.get('unexport') || parsed.flags.get('n'));
  const printFlag = Boolean(parsed.flags.get('print') || parsed.flags.get('p'));
  const operands = parsed.positional;

  // -p only: print exported variables
  if (printFlag && !unexportFlag && operands.length === 0) {
    io.stdout.write(formatDeclare(context.env));
    return 0;
  }

  // No args at all: list env
  if (args.length === 0) {
    io.stdout.write(formatEnv(context.env));
    return 0;
  }

  // Unexport mode: remove names (ignore missing)
  if (unexportFlag) {
    for (const name of operands) {
      if (name.includes('=')) {
        return writeError(io.stderr, `export: invalid use of -n with assignment '${name}'`, 1);
      }
      if (name in context.env) delete (context.env as any)[name];
    }
    return 0;
  }

  // Default: set NAME=VALUE pairs
  for (const pair of operands) {
    const eq = pair.indexOf('=');
    if (eq === -1) {
      return writeError(io.stderr, `export: '${pair}': not a valid identifier`, 1);
    }
    const key = pair.slice(0, eq);
    const value = pair.slice(eq + 1);
    if (!key) {
      return writeError(io.stderr, `export: '${pair}': not a valid identifier`, 1);
    }
    (context.env as any)[key] = value;
  }

  return 0;
}

export const exportAsyncCommand = {
  description: 'Set or display exported environment variables',
  usage: 'export [-n] [-p] [NAME=VALUE]...',
  execute: exportAsync,
};
