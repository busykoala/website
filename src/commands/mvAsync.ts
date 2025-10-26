import { CommandContext, user, group } from '../core/TerminalCore';
import { IOStreams } from '../core/streams';
import { FileSystem } from '../core/filesystem';
import { parseFlags, FlagDefinition } from '../utils/flagParser';
import { resolvePath, normalizePath } from '../utils/pathUtils';
import { ExitCode, missingOperand, commandError, writeError } from '../utils/errorMessages';

const flagDefs: FlagDefinition[] = [
  { short: 'f', long: 'force', type: 'boolean', default: false },
  { short: 'i', long: 'interactive', type: 'boolean', default: false },
  { short: 'n', long: 'no-clobber', type: 'boolean', default: false },
  { short: 'u', long: 'update', type: 'boolean', default: false },
  { short: 'v', long: 'verbose', type: 'boolean', default: false },
  { short: 'b', long: 'backup', type: 'boolean', default: false },
];

export async function mvAsync(
  args: string[],
  context: CommandContext,
  io: IOStreams,
): Promise<number> {
  // Help/version
  if (args.includes('--help') || args.includes('-h')) {
    io.stdout.write(
      mvAsyncCommand.usage || mvAsyncCommand.description || 'mv [OPTION]... SOURCE DEST',
    );
    return ExitCode.SUCCESS;
  }
  if (args.includes('--version')) {
    io.stdout.write('mv (GNU coreutils simulation) 1.0.0\n');
    return ExitCode.SUCCESS;
  }

  const parsed = parseFlags(args, flagDefs);
  const force = !!(parsed.flags.get('force') || parsed.flags.get('f'));
  const interactive = !!(parsed.flags.get('interactive') || parsed.flags.get('i'));
  const noClobber = !!(parsed.flags.get('no-clobber') || parsed.flags.get('n'));
  const updateOnly = !!(parsed.flags.get('update') || parsed.flags.get('u'));
  const verbose = !!(parsed.flags.get('verbose') || parsed.flags.get('v'));
  const backup = !!(parsed.flags.get('backup') || parsed.flags.get('b'));

  const fs = context.terminal.getFileSystem();

  const targets = parsed.positional;
  if (targets.length < 2) {
    return writeError(io.stderr, missingOperand('mv'), ExitCode.GENERAL_ERROR);
  }

  const sources = targets.slice(0, -1).map((p) => normalizePath(resolvePath(p, context.env.PWD)));
  const destinationInput = targets[targets.length - 1];
  const destPath = normalizePath(resolvePath(destinationInput, context.env.PWD));

  const logVerbose = (srcFull: string, destFull: string) => {
    if (verbose) io.stdout.write(`${srcFull} -> ${destFull}\n`);
  };

  const pathParts = (fullPath: string) => {
    const parent = fullPath.substring(0, fullPath.lastIndexOf('/')) || '/';
    const name = fullPath.split('/').pop()!;
    return { parent, name } as const;
  };

  // Helper: get parent node and name for a path
  const getParentAndChild = (fullPath: string) => {
    const { parent, name } = pathParts(fullPath);
    const parentNode = fs.getNode(parent, user, group);
    if (!parentNode) {
      throw new Error(`Path '${parent}' not found.`);
    }
    return { parentNode, childName: name, parentPath: parent } as const;
  };

  // Perform the move of a node reference from one parent to another
  const moveNode = (srcFull: string, destDir: string, destName: string) => {
    const {
      parentNode: srcParentNode,
      childName: srcName,
      parentPath: srcParentPath,
    } = getParentAndChild(srcFull);
    const srcChildren = srcParentNode.children || {};
    const srcNode = srcChildren[srcName];
    if (!srcNode) throw new Error(`Path '${srcFull}' not found.`);

    const destDirNode = fs.getNode(destDir, user, group);
    if (!destDirNode || destDirNode.type !== 'directory')
      throw new Error(`Path '${destDir}' not found.`);

    if (!FileSystem.hasPermission(srcParentNode, 'write', user, group)) {
      throw new Error(`Permission denied: Cannot move from '${srcParentPath}'.`);
    }
    if (!FileSystem.hasPermission(destDirNode, 'write', user, group) && !force) {
      throw new Error(`Permission denied: Cannot move into '${destDir}'.`);
    }

    if (!destDirNode.children) destDirNode.children = {};

    // Handle overwrite policies
    const targetExisting = destDirNode.children[destName];
    if (targetExisting) {
      // If updateOnly and target is newer or same, skip
      try {
        if (
          updateOnly &&
          targetExisting.modified &&
          (srcNode as any).modified &&
          targetExisting.modified >= (srcNode as any).modified
        ) {
          return { skipped: true } as const;
        }
      } catch {}

      if (noClobber) {
        return { skipped: true } as const;
      }

      if (backup && targetExisting.type === 'file') {
        const backupName = `${destName}~`;
        fs.addFile(
          destDir,
          backupName,
          context.env.USER,
          group,
          (targetExisting as any).owner || context.env.USER,
          (targetExisting as any).group || group,
          (targetExisting as any).content || '',
          (targetExisting as any).permissions || 'rw-r--r--',
          false,
          true, // bypass perms
        );
      }

      if (interactive && !force) {
        io.stderr.write(`mv: overwrite '${normalizePath(destDir + '/' + destName)}'?`);
        throw new Error('interactive-abort');
      }

      // Remove the existing target
      try {
        fs.removeNode(normalizePath(`${destDir}/${destName}`), user, group);
      } catch (e) {
        if (!force) throw e;
      }
    }

    // Remove from source parent and attach to destination
    if (!srcParentNode.children) srcParentNode.children = {};
    delete srcParentNode.children[srcName];

    // Attach node under new name
    (destDirNode.children as any)[destName] = srcNode;
    (srcNode as any).name = destName;
    (srcNode as any).modified = new Date();

    return { skipped: false } as const;
  };

  try {
    // Destination node determination
    let destNode: any;
    try {
      destNode = fs.getNode(destPath, user, group);
    } catch {
      destNode = null;
    }

    const multipleSources = sources.length > 1;
    if (multipleSources && (!destNode || destNode.type !== 'directory')) {
      return writeError(
        io.stderr,
        `mv: target '${destinationInput}' is not a directory`,
        ExitCode.GENERAL_ERROR,
      );
    }

    for (const srcPath of sources) {
      let srcNode: any = null;
      try {
        srcNode = fs.getNode(srcPath, user, group);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'No such file or directory';
        return writeError(
          io.stderr,
          commandError('mv', `cannot stat '${normalizePath(srcPath)}': ${msg}`),
          ExitCode.GENERAL_ERROR,
        );
      }
      if (!srcNode) {
        return writeError(
          io.stderr,
          commandError('mv', `cannot stat '${normalizePath(srcPath)}': No such file or directory`),
          ExitCode.GENERAL_ERROR,
        );
      }

      let targetDir = '';
      let targetName = '';
      let finalDestFull = '';

      if (destNode && destNode.type === 'directory') {
        targetDir = destPath;
        targetName = srcNode.name;
        finalDestFull = normalizePath(`${targetDir}/${targetName}`);
      } else if (!multipleSources) {
        const { parent, name } = pathParts(destPath);
        targetDir = parent;
        targetName = name;
        finalDestFull = normalizePath(`${targetDir}/${targetName}`);
      } else {
        return writeError(
          io.stderr,
          `mv: target '${destinationInput}' is not a directory`,
          ExitCode.GENERAL_ERROR,
        );
      }

      const result = moveNode(srcPath, targetDir, targetName);
      if (!(result as any).skipped) {
        logVerbose(srcPath, finalDestFull);
      }
    }

    return ExitCode.SUCCESS;
  } catch (error) {
    if (error instanceof Error && error.message === 'interactive-abort') {
      return ExitCode.GENERAL_ERROR;
    }
    return writeError(
      io.stderr,
      commandError('mv', error instanceof Error ? error.message : 'Unknown error'),
      ExitCode.GENERAL_ERROR,
    );
  }
}

export const mvAsyncCommand = {
  description: 'Move (rename) files',
  usage: 'mv [-finubv] SOURCE... DEST',
  execute: mvAsync,
};
