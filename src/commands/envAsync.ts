import { CommandContext } from '../core/TerminalCore';
import { IOStreams } from '../core/streams';
import { Shell } from '../core/Shell';
import { resolvePath } from '../utils/pathUtils';
import { writeError } from '../utils/errorMessages';
import { parseFlags, FlagDefinition } from '../utils/flagParser';
import { validateDirectory } from '../utils/fileValidation';

function splitCommandLine(input: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (inSingle) {
      if (ch === "'") {
        inSingle = false;
      } else {
        cur += ch;
      }
    } else if (inDouble) {
      if (ch === '"') {
        inDouble = false;
      } else if (ch === '\\' && i + 1 < input.length) {
        cur += input[++i];
      } else {
        cur += ch;
      }
    } else {
      if (ch === '"') {
        inDouble = true;
      } else if (ch === "'") {
        inSingle = true;
      } else if (/\s/.test(ch)) {
        if (cur.length) {
          result.push(cur);
          cur = '';
        }
      } else if (ch === '\\' && i + 1 < input.length) {
        cur += input[++i];
      } else {
        cur += ch;
      }
    }
  }
  if (cur.length) result.push(cur);
  return result;
}

function collectMultiArgs(args: string[], short: string, long?: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === `-${short}` || (long && a === `--${long}`)) {
      if (i + 1 < args.length) out.push(args[++i]);
      continue;
    }
    if (a.startsWith(`-${short}`) && a.length > 2) {
      out.push(a.slice(2));
      continue;
    }
    if (long && a.startsWith(`--${long}=`)) {
      out.push(a.split('=')[1] || '');
      continue;
    }
  }
  return out;
}

const ENV_FLAGS: FlagDefinition[] = [
  { short: 'i', long: 'ignore-environment' },
  { short: '0', long: 'null' },
  { short: 'u', long: 'unset', takesValue: true, type: 'string' },
  { short: 'C', long: 'chdir', takesValue: true, type: 'string' },
  { short: 'S', long: 'split-string', takesValue: true, type: 'string' },
];

export async function envAsync(
  args: string[],
  context: CommandContext,
  io: IOStreams,
): Promise<number> {
  // Parse using shared flag parser
  const parsed = parseFlags(args, ENV_FLAGS);

  // Help and version passthrough
  if (args.includes('--help') || args.includes('-h')) {
    io.stdout.write(`Usage: env [OPTION]... [-] [NAME=VALUE]... [COMMAND [ARG]...]
Set each NAME to VALUE in the environment and run COMMAND.

Options:
  -i, --ignore-environment   start with an empty environment
  -0, --null                 end each output line with NUL, not newline
  -u, --unset=NAME           remove variable from the environment
  -C, --chdir=DIR            change working directory to DIR
  -S, --split-string=STR     process and split STR into separate arguments
      --help                 display this help and exit
      --version              output version information and exit
`);
    return 0;
  }
  if (args.includes('--version')) {
    io.stdout.write('env (GNU coreutils simulation) 1.0.0\n');
    return 0;
  }

  // Flags and parsing state
  const ignoreEnv =
    parsed.flags.get('ignore-environment') === true || parsed.flags.has('i') || args.includes('-');
  const nullDelim = parsed.flags.get('null') === true || parsed.flags.has('0');
  const unsetNames = collectMultiArgs(args, 'u', 'unset');
  const chdirPath = (parsed.flags.get('chdir') as string) ?? null;
  const splitStr = (parsed.flags.get('split-string') as string) ?? null;

  // Extract assignments and command tokens from positionals
  const assignments: Record<string, string> = {};
  const positionals = parsed.positional.filter((t) => t !== '-'); // '-' already handled as ignore env
  let commandTokens: string[] = [];
  let i = 0;
  while (i < positionals.length) {
    const tok = positionals[i];
    if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(tok)) {
      const eq = tok.indexOf('=');
      assignments[tok.slice(0, eq)] = tok.slice(eq + 1);
      i++;
      continue;
    }
    break;
  }
  commandTokens = positionals.slice(i);

  // Build temporary environment
  const originalEnv = context.env;
  const tempEnv: any = ignoreEnv ? {} : { ...originalEnv };

  // Apply unsets
  for (const name of unsetNames) delete tempEnv[name];
  // Apply assignments
  for (const [k, v] of Object.entries(assignments)) tempEnv[k] = v;

  // If no command provided and splitStr present, splitStr provides the command
  if (commandTokens.length === 0 && splitStr) {
    commandTokens = splitCommandLine(splitStr);
  }

  // No command: print environment
  if (commandTokens.length === 0) {
    const entries = Object.entries(tempEnv)
      .filter(([k]) => k !== 'COMMANDS')
      .map(([k, v]) => `${k}=${v}`);
    const sep = nullDelim ? '\0' : '<br>';
    const out = entries.join(sep) + (nullDelim ? '\0' : '');
    io.stdout.write(out);
    return 0;
  }

  // Command execution path
  const shell = context.shell as Shell;
  const registry = shell?.getCommands ? shell.getCommands() : {};

  // Resolve working directory
  const fs = context.terminal.getFileSystem();
  const originalPWD = originalEnv.PWD;
  let restoredPWD = false;
  if (chdirPath) {
    const dirCheck = validateDirectory('env', fs, chdirPath, originalPWD);
    if (dirCheck.error) {
      return writeError(
        io.stderr,
        `env: cannot change directory to '${chdirPath}': No such directory`,
        1,
      );
    }
    tempEnv.PWD = resolvePath(chdirPath, originalPWD);
  }

  // Determine command and args (support -S overriding tokens)
  let tokens = commandTokens;
  if (splitStr) tokens = splitCommandLine(splitStr);
  const cmdName = tokens[0];
  const cmdArgs = tokens.slice(1);

  const entry = (registry as any)[cmdName];
  if (!entry) {
    io.stderr.write(`env: '${cmdName}': No such command`);
    return 127;
  }

  // Swap context.env temporarily
  context.env = tempEnv;
  let status = 0;
  try {
    status = await entry.fn(cmdArgs, context, io);
  } finally {
    // Restore env and PWD
    context.env = originalEnv;
    if (chdirPath && !restoredPWD) {
      originalEnv.PWD = originalPWD;
      restoredPWD = true;
    }
  }
  return status;
}

export const envAsyncCommand = {
  description: 'Run a command in a modified environment or print it',
  usage: 'env [-i] [-0] [-u NAME] [-C DIR] [-S STR] [NAME=VALUE]... [COMMAND [ARG]...]',
  execute: envAsync,
};
