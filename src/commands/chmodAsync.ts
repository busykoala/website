import { CommandContext } from '../core/TerminalCore';
import { IOStreams } from '../core/streams';
import { parseSimpleFlags } from '../utils/flagParser';
import { resolvePath } from '../utils/pathUtils';
import { ExitCode, writeError, commandError, fileNotFound } from '../utils/errorMessages';

function octalToPermString(octal: string): string {
  // support leading 0 e.g., 0755 or 755
  const cleaned = octal.replace(/^0+/, '');
  const parts = cleaned.split('').slice(-3); // last 3 digits
  const mapping: Record<string, string> = {
    '0': '---',
    '1': '--x',
    '2': '-w-',
    '3': '-wx',
    '4': 'r--',
    '5': 'r-x',
    '6': 'rw-',
    '7': 'rwx',
  };
  return parts.map((p) => mapping[p] || '---').join('');
}

function applySymbolicMode(current: string, modeSpec: string): string {
  // current: 'rwxr-xr-x'
  let perms = current.split('');
  const specs = modeSpec.split(',');

  for (const spec of specs) {
    const m = spec.match(/^([ugoa]*)([+=-])(.*)$/);
    if (!m) continue;
    const who = m[1] || 'a';
    const op = m[2];
    const modes = m[3];

    const targets = [] as Array<0 | 1 | 2>;
    if (who.includes('u') || who === 'a') targets.push(0);
    if (who.includes('g') || who === 'a') targets.push(1);
    if (who.includes('o') || who === 'a') targets.push(2);

    for (const t of targets) {
      const base = t * 3;
      for (const ch of ['r', 'w', 'x'] as const) {
        if (modes.includes(ch)) {
          const idx = base + (ch === 'r' ? 0 : ch === 'w' ? 1 : 2);
          if (op === '+') perms[idx] = ch;
          else if (op === '-') perms[idx] = '-';
          else if (op === '=') perms[idx] = '-'; // reset then set below
        }
      }
      if (op === '=') {
        for (let k = 0; k < 3; k++) perms[base + k] = '-';
        for (const ch of modes) {
          const idx = base + (ch === 'r' ? 0 : ch === 'w' ? 1 : 2);
          if (ch === 'r' || ch === 'w' || ch === 'x') perms[idx] = ch;
        }
      }
    }
  }

  return perms.join('');
}

export async function chmodAsync(
  args: string[],
  context: CommandContext,
  io: IOStreams,
): Promise<number> {
  // Help / version
  if (args.includes('--help') || args.includes('-h')) {
    io.stdout.write(
      chmodAsyncCommand.usage || chmodAsyncCommand.description || 'chmod [MODE] FILE...',
    );
    return ExitCode.SUCCESS;
  }
  if (args.includes('--version')) {
    io.stdout.write('chmod (GNU coreutils simulation) 1.0.0\n');
    return ExitCode.SUCCESS;
  }

  const { flags, positional } = parseSimpleFlags(args);
  const force = flags.has('f');
  const verbose = flags.has('v');
  const changesOnly = flags.has('c');
  const recursive = flags.has('R');

  // mode + at least one path required
  const modeOrEntry = positional[0];
  const paths = positional.slice(1);

  if (!modeOrEntry || paths.length === 0) {
    if (!force) return writeError(io.stderr, 'chmod: missing operand', ExitCode.GENERAL_ERROR);
    return ExitCode.SUCCESS;
  }

  const fs = context.terminal.getFileSystem();
  const isOctal = /^0?[0-7]{3}$/.test(String(modeOrEntry));
  const isSymbolic = /[ugoa+=-]/.test(String(modeOrEntry));

  try {
    for (const rawPath of paths) {
      try {
        const fullPath = resolvePath(rawPath, context.env.PWD);
        let node: any;
        try {
          node = fs.getNode(fullPath, context.env.USER, context.env.GROUP || 'busygroup');
        } catch {
          if (!force) {
            // Standardized not found message
            writeError(io.stderr, fileNotFound('chmod', rawPath), ExitCode.GENERAL_ERROR);
            return ExitCode.GENERAL_ERROR;
          }
          continue;
        }
        if (!node) {
          if (!force) {
            writeError(io.stderr, fileNotFound('chmod', rawPath), ExitCode.GENERAL_ERROR);
            return ExitCode.GENERAL_ERROR;
          }
          continue;
        }

        const logChange = (oldPerm: string, newPerm: string, pathShown: string) => {
          const changed = oldPerm !== newPerm;
          if (changesOnly) {
            if (changed)
              io.stdout.write(`mode of '${pathShown}' changed from ${oldPerm} to ${newPerm}`);
          } else if (verbose) {
            if (changed)
              io.stdout.write(`mode of '${pathShown}' changed from ${oldPerm} to ${newPerm}`);
            else io.stdout.write(`mode of '${pathShown}' retained as ${newPerm}`);
          }
        };

        const applyToNode = (n: any, shownPath: string) => {
          try {
            const oldPerm = n.permissions as string;
            let newPerm = oldPerm;
            if (isOctal) {
              newPerm = octalToPermString(String(modeOrEntry));
            } else if (isSymbolic) {
              newPerm = applySymbolicMode(oldPerm, String(modeOrEntry));
            } else {
              if (String(modeOrEntry).length === 9) newPerm = String(modeOrEntry);
            }
            n.permissions = newPerm;
            logChange(oldPerm, newPerm, shownPath);
          } catch (e) {
            if (!force)
              writeError(
                io.stderr,
                `chmod: failed to change permissions for '${shownPath}': ${e instanceof Error ? e.message : String(e)}`,
              );
          }
        };

        applyToNode(node, rawPath);

        if (recursive && node.type === 'directory') {
          const traverse = (dir: any, basePath: string) => {
            if (!dir.children) return;
            for (const childName of Object.keys(dir.children)) {
              const child = dir.children[childName];
              const childShown = `${basePath}/${childName}`;
              applyToNode(child, childShown);
              if (child.type === 'directory') traverse(child, childShown);
            }
          };
          traverse(node, rawPath);
        }
      } catch (innerErr) {
        if (!force) throw innerErr;
      }
    }

    return ExitCode.SUCCESS;
  } catch (error) {
    return writeError(
      io.stderr,
      commandError('chmod', error instanceof Error ? error.message : 'Unknown error'),
      force ? ExitCode.SUCCESS : ExitCode.GENERAL_ERROR,
    );
  }
}

export const chmodAsyncCommand = {
  description: 'Change file mode bits',
  usage: `chmod [-cfhv] [-R [-H | -L | -P]] mode|entry file ...`,
  execute: chmodAsync,
};
