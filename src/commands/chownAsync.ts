import { CommandContext } from '../core/TerminalCore';
import { IOStreams } from '../core/streams';
import { parseSimpleFlags } from '../utils/flagParser';
import { resolvePath } from '../utils/pathUtils';
import { ExitCode, writeError, commandError, fileNotFound } from '../utils/errorMessages';

export async function chownAsync(
  args: string[],
  context: CommandContext,
  io: IOStreams,
): Promise<number> {
  // Help/version
  if (args.includes('--help') || args.includes('-h')) {
    io.stdout.write(
      chownAsyncCommand.usage || chownAsyncCommand.description || 'chown [OWNER][:GROUP] FILE...',
    );
    return ExitCode.SUCCESS;
  }
  if (args.includes('--version')) {
    io.stdout.write('chown (GNU coreutils simulation) 1.0.0\n');
    return ExitCode.SUCCESS;
  }

  const { flags, positional } = parseSimpleFlags(args);
  // Support flags: -f (force), -v (verbose), -R (recursive), -c (changes only)
  const force = flags.has('f');
  const verbose = flags.has('v');
  const changesOnly = flags.has('c');
  const recursive = flags.has('R');

  const ownerGroup = positional[0];
  const paths = positional.slice(1);

  if (!ownerGroup || paths.length === 0) {
    if (!force) return writeError(io.stderr, 'chown: missing operand', ExitCode.GENERAL_ERROR);
    return ExitCode.SUCCESS;
  }

  // ownerGroup can be 'owner:group' or ':group' or 'owner:'
  let newOwner: string | null = null;
  let newGroup: string | null = null;
  if (ownerGroup.startsWith(':')) {
    newGroup = ownerGroup.slice(1) || null;
  } else if (ownerGroup.includes(':')) {
    const parts = ownerGroup.split(':');
    newOwner = parts[0] || null;
    newGroup = parts[1] || null;
  } else {
    newOwner = ownerGroup || null;
  }

  const fs = context.terminal.getFileSystem();

  try {
    for (const rawPath of paths) {
      try {
        const fullPath = resolvePath(rawPath, context.env.PWD);
        let node: any;
        try {
          node = fs.getNode(fullPath, context.env.USER, context.env.GROUP || 'busygroup');
        } catch {
          if (!force) {
            writeError(io.stderr, fileNotFound('chown', rawPath), ExitCode.GENERAL_ERROR);
            return ExitCode.GENERAL_ERROR;
          }
          continue;
        }
        if (!node) {
          if (!force) {
            writeError(io.stderr, fileNotFound('chown', rawPath), ExitCode.GENERAL_ERROR);
            return ExitCode.GENERAL_ERROR;
          }
          continue;
        }

        const log = (oldO: string, oldG: string, newO: string, newG: string, shownPath: string) => {
          const changed = oldO !== newO || oldG !== newG;
          if (changesOnly) {
            if (changed)
              io.stdout.write(
                `changed ownership of '${shownPath}' from ${oldO}:${oldG} to ${newO}:${newG}`,
              );
          } else if (verbose) {
            if (changed)
              io.stdout.write(
                `changed ownership of '${shownPath}' from ${oldO}:${oldG} to ${newO}:${newG}`,
              );
            else io.stdout.write(`ownership of '${shownPath}' retained as ${newO}:${newG}`);
          }
        };

        const applyToNode = (n: any, shownPath = rawPath) => {
          try {
            const oldOwner = n.owner;
            const oldGroup = n.group;
            const appliedOwner = newOwner !== null ? newOwner : n.owner;
            const appliedGroup = newGroup !== null ? newGroup : n.group;
            if (newOwner !== null) n.owner = newOwner;
            if (newGroup !== null) n.group = newGroup;
            log(oldOwner, oldGroup, appliedOwner, appliedGroup, shownPath);
          } catch (e) {
            if (!force)
              writeError(
                io.stderr,
                `chown: failed to change owner for '${shownPath}': ${e instanceof Error ? e.message : String(e)}`,
              );
          }
        };

        applyToNode(node, rawPath);

        if (recursive && node.type === 'directory') {
          const traverse = (dir: any, base: string, shownBase: string) => {
            if (!dir.children) return;
            for (const childName of Object.keys(dir.children)) {
              const child = dir.children[childName];
              const childShown = `${shownBase}/${childName}`;
              applyToNode(child, childShown);
              if (child.type === 'directory') traverse(child, `${base}/${childName}`, childShown);
            }
          };
          traverse(node, fullPath, rawPath);
        }
      } catch (innerErr) {
        if (!force) throw innerErr;
      }
    }
    return ExitCode.SUCCESS;
  } catch (error) {
    return writeError(
      io.stderr,
      commandError('chown', error instanceof Error ? error.message : 'Unknown error'),
      force ? ExitCode.SUCCESS : ExitCode.GENERAL_ERROR,
    );
  }
}

export const chownAsyncCommand = {
  description: 'Change file owner and group',
  usage: `chown [-cfhnvx] [-R [-H | -L | -P]] owner[:group] file ...\n       chown [-cfhnvx] [-R [-H | -L | -P]] :group file ...`,
  execute: chownAsync,
};
