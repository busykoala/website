import { CommandContext, user, group } from '../core/TerminalCore';
import { IOStreams } from '../core/streams';
import { parseFlags, FlagDefinition } from '../utils/flagParser';
import { resolvePath, normalizePath } from '../utils/pathUtils';
import {
  ExitCode,
  missingOperand,
  fileExists as fileExistsMsg,
  commandError,
  permissionDenied,
  writeError,
} from '../utils/errorMessages';

function octalToPerms(octal: string | undefined, fallback: string): string {
  if (!octal) return fallback;
  const m = String(octal).replace(/^0/, '');
  if (!/^\d{3}$/.test(m)) return fallback;
  const toTriplet = (n: number) => `${n & 4 ? 'r' : '-'}${n & 2 ? 'w' : '-'}${n & 1 ? 'x' : '-'}`;
  return `${toTriplet(parseInt(m[0], 8))}${toTriplet(parseInt(m[1], 8))}${toTriplet(parseInt(m[2], 8))}`;
}

const flagDefs: FlagDefinition[] = [
  { short: 'p', long: 'parents', type: 'boolean', default: false },
  { short: 'v', long: 'verbose', type: 'boolean', default: false },
  { short: 'm', long: 'mode', type: 'string', takesValue: true },
];

export async function mkdirAsync(
  args: string[],
  context: CommandContext,
  io: IOStreams,
): Promise<number> {
  // Help/version first
  if (args.includes('--help') || args.includes('-h')) {
    io.stdout.write(
      mkdirAsyncCommand.usage || mkdirAsyncCommand.description || 'mkdir [OPTION]... DIRECTORY...',
    );
    return ExitCode.SUCCESS;
  }
  if (args.includes('--version')) {
    io.stdout.write('mkdir (GNU coreutils simulation) 1.0.0\n');
    return ExitCode.SUCCESS;
  }

  const parsed = parseFlags(args, flagDefs);
  const makeParents = !!(parsed.flags.get('parents') || parsed.flags.get('p'));
  const verbose = !!(parsed.flags.get('verbose') || parsed.flags.get('v'));
  const modeStr = (parsed.flags.get('mode') || parsed.flags.get('m')) as string | undefined;

  const targets = parsed.positional.filter((a) => !a.startsWith('-'));
  if (targets.length === 0) {
    return writeError(io.stderr, missingOperand('mkdir'), ExitCode.GENERAL_ERROR);
  }

  const fs = context.terminal.getFileSystem();
  const defaultPerms = 'rwxr-xr-x';
  const perms = octalToPerms(modeStr, defaultPerms);

  const logCreated = (full: string) => {
    if (verbose) io.stdout.write(`mkdir: created directory '${full}'\n`);
  };

  const addDir = (parent: string, name: string) => {
    fs.addDirectory(parent, name, user, group, context.env.USER, group, perms);
  };

  try {
    for (const input of targets) {
      const fullPath = normalizePath(resolvePath(input, context.env.PWD));
      if (makeParents) {
        // Create parent chain as needed
        const parts = fullPath.split('/').filter(Boolean);
        let currPath = '';
        for (let i = 0; i < parts.length; i++) {
          const name = parts[i];
          const parentPath = currPath ? `/${currPath}` : '/';
          const targetPath = parentPath.endsWith('/')
            ? `${parentPath}${name}`
            : `${parentPath}/${name}`;

          let node: any = null;
          try {
            node = fs.getNode(targetPath, user, group, 'execute');
          } catch {
            node = null;
          }

          if (node) {
            if (node.type !== 'directory') {
              return writeError(io.stderr, fileExistsMsg('mkdir', input), ExitCode.GENERAL_ERROR);
            }
          } else {
            try {
              addDir(parentPath, name);
              logCreated(targetPath);
            } catch (e) {
              const msg = e instanceof Error ? e.message : String(e);
              if (msg.toLowerCase().includes('permission denied')) {
                return writeError(
                  io.stderr,
                  permissionDenied('mkdir', input),
                  ExitCode.GENERAL_ERROR,
                );
              }
              return writeError(io.stderr, commandError('mkdir', msg), ExitCode.GENERAL_ERROR);
            }
          }
          currPath = currPath ? `${currPath}/${name}` : name;
        }
      } else {
        // Create single directory, parent must exist and be writable
        const parentPath = fullPath.substring(0, fullPath.lastIndexOf('/')) || '/';
        const dirName = fullPath.split('/').pop()!;

        // Already exists?
        let existing: any = null;
        try {
          existing = fs.getNode(fullPath, user, group, 'execute');
        } catch {
          existing = null;
        }
        if (existing) {
          return writeError(io.stderr, fileExistsMsg('mkdir', input), ExitCode.GENERAL_ERROR);
        }

        try {
          addDir(parentPath, dirName);
          logCreated(fullPath);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          if (msg.toLowerCase().includes('permission denied')) {
            return writeError(io.stderr, permissionDenied('mkdir', input), ExitCode.GENERAL_ERROR);
          }
          return writeError(io.stderr, commandError('mkdir', msg), ExitCode.GENERAL_ERROR);
        }
      }
    }

    return ExitCode.SUCCESS;
  } catch (error) {
    return writeError(
      io.stderr,
      commandError('mkdir', error instanceof Error ? error.message : 'Unknown error'),
    );
  }
}

export const mkdirAsyncCommand = {
  description: 'Create directories',
  usage: 'mkdir [-pv] [-m MODE] DIRECTORY...',
  execute: mkdirAsync,
};
