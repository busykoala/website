import { CommandContext } from '../core/TerminalCore';
import { IOStreams } from '../core/streams';
import { parseSimpleFlags } from '../utils/flagParser';
import { resolvePath } from '../utils/pathUtils';
import { ExitCode, writeError } from '../utils/errorMessages';

export async function cpAsync(
  args: string[],
  context: CommandContext,
  io: IOStreams,
): Promise<number> {
  // Handle help flag
  if (args.includes('--help') || args.includes('-h')) {
    io.stdout.write(
      cpAsyncCommand.usage || cpAsyncCommand.description || 'cp [OPTION]... SOURCE DEST',
    );
    return ExitCode.SUCCESS;
  }
  if (args.includes('--version')) {
    io.stdout.write('cp (GNU coreutils simulation) 1.0.0\n');
    return ExitCode.SUCCESS;
  }

  // Parse flags and operands
  const { flags, positional } = parseSimpleFlags(args);
  const operands: string[] = positional;

  if (operands.length < 2) {
    return writeError(io.stderr, 'cp: missing file operand', ExitCode.GENERAL_ERROR);
  }

  const fs = context.terminal.getFileSystem();
  const user = context.env.USER;
  const group = context.env.GROUP || 'busygroup';

  // Determine behavior
  const recursive = flags.has('R') || flags.has('r') || flags.has('a');
  const archive = flags.has('a');
  const force = flags.has('f');
  const interactive = flags.has('i');
  const noClobber = flags.has('n');
  const preserve = flags.has('p') || archive;
  const updateOnly = flags.has('u');
  const verbose = flags.has('v');
  const backup = flags.has('b'); // simple backup with ~ suffix

  const sources = operands.slice(0, -1);
  const destination = operands[operands.length - 1];

  const destPath = resolvePath(destination, context.env.PWD);

  const logVerbose = (srcFull: string, destFull: string) => {
    if (verbose) io.stdout.write(`${srcFull} -> ${destFull}\n`);
  };

  // Helper to copy a single file node
  const copyFile = (
    sourceNode: any,
    targetDir: string,
    targetName: string,
    srcFullPath: string,
  ) => {
    const targetFullPath = resolvePath(`${targetDir}/${targetName}`, '/');
    let existing: any;
    try {
      existing = fs.getNode(targetFullPath, user, group);
    } catch {
      existing = null;
    }

    if (existing && existing.type === 'directory') {
      writeError(
        io.stderr,
        `cp: cannot overwrite directory '${targetFullPath}' with non-directory`,
      );
      throw new Error('is-directory');
    }

    if (existing) {
      // -u: only copy if source is newer than destination
      if (updateOnly) {
        try {
          if (
            existing.modified &&
            sourceNode.modified &&
            existing.modified >= sourceNode.modified
          ) {
            // skip copy
            return;
          }
        } catch {}
      }
      if (noClobber) {
        // skip
        return;
      }
      if (backup && existing.type === 'file') {
        // create backup with ~ suffix
        const parent = targetFullPath.substring(0, targetFullPath.lastIndexOf('/')) || '/';
        const bname = (targetFullPath.split('/').pop() || '') + '~';
        fs.addFile(
          parent,
          bname,
          user,
          group,
          existing.owner || user,
          existing.group || group,
          existing.content || '',
          existing.permissions || 'rw-r--r--',
          false,
          true,
        );
      }
      if (interactive) {
        writeError(io.stderr, `cp: overwrite '${targetFullPath}'?`);
        throw new Error('interactive-abort');
      }
      // else will overwrite (force or normal)
    }

    const owner = preserve ? sourceNode.owner : user;
    const fileGroup = preserve ? sourceNode.group : group;
    const permissions = preserve ? sourceNode.permissions : sourceNode.permissions; // keep permissions for now

    fs.addFile(
      targetDir,
      targetName,
      user,
      group,
      owner,
      fileGroup,
      sourceNode.content || '',
      permissions,
      false,
      force, // bypassPermissions when force is set
    );

    // Preserve modified time if requested
    if (preserve && sourceNode.modified) {
      try {
        const newNode = fs.getNode(targetFullPath, user, group) as any;
        if (newNode) newNode.modified = new Date(sourceNode.modified);
      } catch {}
    }

    logVerbose(srcFullPath, targetFullPath);
  };

  // Recursive copy for directories (copy directory into target parent, creating a child with same name)
  const copyDirectoryRecursive = (srcNode: any, destParentPath: string, srcFullPath: string) => {
    const dirName = srcNode.name;
    const newDirPath = resolvePath(`${destParentPath}/${dirName}`, '/');

    try {
      fs.addDirectory(
        destParentPath,
        dirName,
        user,
        group,
        preserve ? srcNode.owner : user,
        preserve ? srcNode.group : group,
        preserve ? srcNode.permissions : 'rwxr-xr-x',
        force, // bypassPermissions
      );
      if (preserve && srcNode.modified) {
        const dnode = fs.getNode(newDirPath, user, group) as any;
        if (dnode) dnode.modified = new Date(srcNode.modified);
      }
    } catch {
      // ignore if exists
    }

    const children = Object.values(srcNode.children || {}) as any[];
    for (const child of children) {
      if (child.type === 'file') {
        copyFile(child, newDirPath, child.name, `${srcFullPath}/${child.name}`);
      } else if (child.type === 'directory') {
        copyDirectoryRecursive(child, newDirPath, `${srcFullPath}/${child.name}`);
      }
    }
  };

  try {
    // Determine if destination is a directory when multiple sources
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
        `cp: target '${destination}' is not a directory`,
        ExitCode.GENERAL_ERROR,
      );
    }

    for (const src of sources) {
      const srcPath = resolvePath(src, context.env.PWD);
      let srcNode: any = null;
      try {
        srcNode = fs.getNode(srcPath, user, group);
      } catch (e) {
        return writeError(
          io.stderr,
          `cp: cannot stat '${src}': ${
            e instanceof Error ? e.message : 'No such file or directory'
          }`,
          ExitCode.GENERAL_ERROR,
        );
      }

      if (!srcNode) {
        return writeError(
          io.stderr,
          `cp: cannot stat '${src}': No such file or directory`,
          ExitCode.GENERAL_ERROR,
        );
      }

      if (srcNode.type === 'directory') {
        if (!recursive) {
          return writeError(
            io.stderr,
            `cp: -r not specified; omitting directory '${src}'`,
            ExitCode.GENERAL_ERROR,
          );
        }

        if (destNode && destNode.type === 'directory') {
          // copy SRC under DEST directory
          copyDirectoryRecursive(srcNode, destPath, srcPath);
        } else if (!multipleSources) {
          // single source directory to a destination path (may or may not exist)
          const parent = destPath.substring(0, destPath.lastIndexOf('/')) || '/';
          const destName = destPath.split('/').pop()!;
          try {
            fs.addDirectory(
              parent,
              destName,
              user,
              group,
              preserve ? srcNode.owner : user,
              preserve ? srcNode.group : group,
              preserve ? srcNode.permissions : 'rwxr-xr-x',
              force,
            );
            if (preserve && srcNode.modified) {
              const dnode = fs.getNode(destPath, user, group) as any;
              if (dnode) dnode.modified = new Date(srcNode.modified);
            }
          } catch {
            // ignore if exists
          }
          // Copy children into DEST (not nesting an extra src dir)
          const children = Object.values(srcNode.children || {}) as any[];
          for (const child of children) {
            if (child.type === 'file') {
              copyFile(child, destPath, child.name, `${srcPath}/${child.name}`);
            } else if (child.type === 'directory') {
              copyDirectoryRecursive(child, destPath, `${srcPath}/${child.name}`);
            }
          }
        }
      } else if (srcNode.type === 'file') {
        if (destNode && destNode.type === 'directory') {
          // copy into directory
          copyFile(srcNode, destPath, srcNode.name, srcPath);
        } else if (multipleSources) {
          return writeError(
            io.stderr,
            `cp: target '${destination}' is not a directory`,
            ExitCode.GENERAL_ERROR,
          );
        } else {
          // single file -> destination file path
          const destParent = destPath.substring(0, destPath.lastIndexOf('/')) || '/';
          const destName = destination.split('/').pop()!;
          copyFile(srcNode, destParent, destName, srcPath);
        }
      }
    }

    return ExitCode.SUCCESS;
  } catch (error) {
    return writeError(
      io.stderr,
      `cp: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ExitCode.GENERAL_ERROR,
    );
  }
}

export const cpAsyncCommand = {
  description: 'Copy files and directories',
  usage: 'cp [-R [-H | -L | -P]] [-fi | -n] [-abpuv] source_file target_file',
  execute: cpAsync,
};
