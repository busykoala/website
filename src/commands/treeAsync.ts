import { CommandContext, user, group } from '../core/TerminalCore';
import { IOStreams } from '../core/streams';
import { FileSystem } from '../core/filesystem';
import { parseFlags, FlagDefinition } from '../utils/flagParser';
import { resolvePath } from '../utils/pathUtils';
import { ExitCode, writeError, commandError } from '../utils/errorMessages';

const flagDefs: FlagDefinition[] = [
  { short: 'a', long: 'all', type: 'boolean', default: false },
  { short: 'd', long: 'dirs', type: 'boolean', default: false },
  { short: 'f', long: 'full-path', type: 'boolean', default: false },
  { short: 'i', long: 'no-indent', type: 'boolean', default: false },
  { short: 'F', long: 'classify', type: 'boolean', default: false },
  { short: 'L', long: 'level', type: 'number', takesValue: true },
];

function isExecutable(perms: string): boolean {
  return perms[2] === 'x' || perms[5] === 'x' || perms[8] === 'x';
}

export async function treeAsync(
  args: string[],
  context: CommandContext,
  io: IOStreams,
): Promise<number> {
  // Help/version
  if (args.includes('--help') || args.includes('-h')) {
    io.stdout.write(treeAsyncCommand.usage || treeAsyncCommand.description || 'tree [DIRECTORY]');
    return ExitCode.SUCCESS;
  }
  if (args.includes('--version')) {
    io.stdout.write('tree (GNU coreutils simulation) 1.0.0\n');
    return ExitCode.SUCCESS;
  }

  const parsed = parseFlags(args, flagDefs);
  const showHidden = !!(parsed.flags.get('all') || parsed.flags.get('a'));
  const dirsOnly = !!(parsed.flags.get('dirs') || parsed.flags.get('d'));
  const showFullPath = !!(parsed.flags.get('full-path') || parsed.flags.get('f'));
  const noIndentLines = !!(parsed.flags.get('no-indent') || parsed.flags.get('i'));
  const classify = !!(parsed.flags.get('classify') || parsed.flags.get('F'));
  const levelVal = (parsed.flags.get('level') ?? parsed.flags.get('L')) as number | undefined;
  const level = typeof levelVal === 'number' && !isNaN(levelVal) ? levelVal : null;

  const inputPath = parsed.positional[0] || context.env.PWD;
  const fileSystem = context.terminal.getFileSystem();

  try {
    const normalizedPath = resolvePath(inputPath, context.env.PWD);
    const node = fileSystem.getNode(normalizedPath, user, group);

    if (!node) {
      return writeError(
        io.stderr,
        `tree: ${inputPath}: No such file or directory`,
        ExitCode.GENERAL_ERROR,
      );
    }

    if (node.type !== 'directory') {
      return writeError(io.stderr, `tree: ${inputPath}: Not a directory`, ExitCode.GENERAL_ERROR);
    }

    if (
      !FileSystem.hasPermission(node, 'read', user, group) ||
      !FileSystem.hasPermission(node, 'execute', user, group)
    ) {
      return writeError(io.stderr, `tree: ${inputPath}: Permission denied`, ExitCode.GENERAL_ERROR);
    }

    const lines: string[] = [];
    const renderDir = (path: string, depth: number) => {
      // Stop if depth limit reached
      if (level !== null && depth >= level) return;

      // list directory
      let children = fileSystem.listDirectory(path, user, group, { showHidden });
      if (dirsOnly) children = children.filter((c) => c.type === 'directory');
      // sort by name
      children.sort((a, b) => a.name.localeCompare(b.name));

      for (let idx = 0; idx < children.length; idx++) {
        const child = children[idx];
        const isLast = idx === children.length - 1;
        const childPath = resolvePath(`${path}/${child.name}`, '/');

        const suffix = classify
          ? child.type === 'directory'
            ? '/'
            : isExecutable(child.permissions)
              ? '*'
              : ''
          : '';
        const displayBase = showFullPath ? childPath : child.name;
        const displayName =
          child.type === 'directory'
            ? `<strong>${displayBase}${suffix}</strong>`
            : `${displayBase}${suffix}`;
        const indent = noIndentLines ? '&nbsp;'.repeat(depth * 4) : '&nbsp;'.repeat(depth * 4);
        const branch = noIndentLines
          ? ''
          : isLast
            ? '&nbsp;&nbsp;&nbsp;&nbsp;&#9492;&mdash;'
            : '&nbsp;&nbsp;&nbsp;&nbsp;&#9500;&mdash;';
        lines.push(`<div>${indent}${branch} ${displayName}</div>`);

        if (child.type === 'directory') {
          renderDir(childPath, depth + 1);
        }
      }
    };

    renderDir(normalizedPath, 0);
    io.stdout.write(`<div style="font-family: monospace;">${lines.join('')}</div>`);
    return ExitCode.SUCCESS;
  } catch (error) {
    return writeError(
      io.stderr,
      commandError('tree', error instanceof Error ? error.message : 'Unknown error'),
      ExitCode.GENERAL_ERROR,
    );
  }
}

export const treeAsyncCommand = {
  description: 'List directory contents in a tree-like format',
  usage: 'tree [-adfiF] [-L LEVEL] [DIRECTORY] [--help] [--version]',
  execute: treeAsync,
};
