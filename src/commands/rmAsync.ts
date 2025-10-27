import { CommandContext, user, group } from '../core/TerminalCore';
import { IOStreams } from '../core/streams';
import { parseFlags, FlagDefinition } from '../utils/flagParser';
import { resolvePath } from '../utils/pathUtils';
import { writeError, ExitCode, missingOperand, commandError } from '../utils/errorMessages';

const flagDefs: FlagDefinition[] = [
  { short: 'f', long: 'force', type: 'boolean', default: false },
  { short: 'i', long: 'interactive', type: 'boolean', default: false },
  { short: 'I', long: 'prompt-once', type: 'boolean', default: false },
  { short: 'r', long: 'recursive', type: 'boolean', default: false },
  { short: 'R', long: 'recursive-cap', type: 'boolean', default: false },
  { short: 'd', long: 'dir-empty-only', type: 'boolean', default: false },
  { short: 'v', long: 'verbose', type: 'boolean', default: false },
];

export async function rmAsync(
  args: string[],
  context: CommandContext,
  io: IOStreams,
): Promise<number> {
  // Handle help/version flags
  if (args.includes('--help') || args.includes('-h')) {
    io.stdout.write(rmAsyncCommand.usage || rmAsyncCommand.description || 'rm [OPTION]... FILE...');
    return ExitCode.SUCCESS;
  }
  if (args.includes('--version')) {
    io.stdout.write('rm (GNU coreutils simulation) 1.0.0\n');
    return ExitCode.SUCCESS;
  }

  const parsed = parseFlags(args, flagDefs);
  const force = !!(parsed.flags.get('force') || parsed.flags.get('f'));
  const interactive = !!(parsed.flags.get('interactive') || parsed.flags.get('i'));
  const promptOnce = !!(parsed.flags.get('prompt-once') || parsed.flags.get('I'));
  const recursive = !!(
    parsed.flags.get('recursive') ||
    parsed.flags.get('recursive-cap') ||
    parsed.flags.get('r') ||
    parsed.flags.get('R')
  );
  const dirEmptyOnly = !!(parsed.flags.get('dir-empty-only') || parsed.flags.get('d'));
  const verbose = !!(parsed.flags.get('verbose') || parsed.flags.get('v'));

  const operands = parsed.positional.filter((a) => !a.startsWith('--') && a !== '-');

  if (operands.length === 0) {
    if (force) return ExitCode.SUCCESS; // rm -f with no operands succeeds silently
    return writeError(io.stderr, missingOperand('rm'), ExitCode.GENERAL_ERROR);
  }

  const fs = context.terminal.getFileSystem();

  // -I: prompt once before removing more than three files, or recursively
  if (promptOnce && !force && (operands.length > 3 || recursive)) {
    return writeError(
      io.stderr,
      `rm: remove ${recursive ? 'recursively' : `${operands.length} arguments`}?`,
      ExitCode.GENERAL_ERROR,
    );
  }

  const logVerbose = (fullPath: string, isDir: boolean) => {
    if (verbose) io.stdout.write(`${isDir ? 'removed directory' : 'removed'} '${fullPath}'\n`);
  };

  try {
    for (const target of operands) {
      if (target === '--help' || target === '--version' || target === '-h') continue;

      const filePath = resolvePath(target, context.env.PWD);

      let node: any = null;
      try {
        node = fs.getNode(filePath, user, group);
      } catch (e) {
        if (force) continue; // ignore nonexistent
        const msg = e instanceof Error ? e.message : 'No such file or directory';
        return writeError(
          io.stderr,
          commandError('rm', `cannot remove '${target}': ${msg}`),
          ExitCode.GENERAL_ERROR,
        );
      }

      if (!node) {
        if (force) continue;
        return writeError(
          io.stderr,
          commandError('rm', `cannot remove '${target}': No such file or directory`),
          ExitCode.GENERAL_ERROR,
        );
      }

      const isDir = node.type === 'directory';

      if (interactive && !force) {
        const kind = isDir ? 'directory' : 'regular file';
        return writeError(io.stderr, `rm: remove ${kind} '${target}'?`, ExitCode.GENERAL_ERROR); // simulate user choosing "No"
      }

      if (isDir) {
        const hasChildren = node.children && Object.keys(node.children).length > 0;
        if (recursive) {
          // allowed
        } else if (dirEmptyOnly) {
          if (hasChildren) {
            return writeError(
              io.stderr,
              `rm: cannot remove '${target}': Directory not empty`,
              ExitCode.GENERAL_ERROR,
            );
          }
        } else {
          return writeError(
            io.stderr,
            `rm: cannot remove '${target}': Is a directory`,
            ExitCode.GENERAL_ERROR,
          );
        }
      }

      try {
        fs.removeNode(filePath, user, group);
      } catch (e) {
        if (force) continue; // ignore errors under -f
        return writeError(
          io.stderr,
          `rm: ${e instanceof Error ? e.message : 'Unknown error'}`,
          ExitCode.GENERAL_ERROR,
        );
      }

      logVerbose(filePath, isDir);
    }

    return ExitCode.SUCCESS;
  } catch (error) {
    return writeError(
      io.stderr,
      commandError('rm', error instanceof Error ? error.message : 'Unknown error'),
      ExitCode.GENERAL_ERROR,
    );
  }
}

export const rmAsyncCommand = {
  description: 'Remove files or directories',
  usage: 'rm [-fIiRrdv] FILE...',
  execute: rmAsync,
};
