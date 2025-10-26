/**
 * CommandResolver - Resolves command execution from multiple sources
 * Priority: built-ins → PATH executables → relative/absolute path executables
 */

import { FileSystem } from './filesystem';
import type { CommandContext } from './TerminalCore';
import { IOStreams } from './streams';
import { resolvePath as resolveFsPath } from '../utils/pathUtils';
import { user, group } from './TerminalCore';

export type AsyncCommand = (
  args: string[],
  context: CommandContext,
  io: IOStreams,
) => Promise<number>;

export interface ResolvedCommand {
  type: 'builtin' | 'executable' | 'script' | 'not_found' | 'not_executable';
  command: AsyncCommand | null;
  path?: string;
  interpreter?: string;
}

export class CommandResolver {
  private builtinCommands: Map<string, AsyncCommand>;
  private executableMap: Map<string, AsyncCommand>;
  private fs: FileSystem;

  constructor(builtinCommands: Map<string, AsyncCommand>, fs: FileSystem) {
    this.builtinCommands = builtinCommands;
    this.executableMap = new Map();
    this.fs = fs;
  }

  /**
   * Register an executable file mapping to a command
   */
  registerExecutable(path: string, command: AsyncCommand): void {
    const full = resolveFsPath(path, '/');
    this.executableMap.set(full, command);
  }

  /**
   * Resolve a command from various sources
   */
  async resolve(commandName: string, context: CommandContext): Promise<ResolvedCommand> {
    // 1. Built-ins
    if (this.builtinCommands.has(commandName)) {
      return { type: 'builtin', command: this.builtinCommands.get(commandName)! };
    }

    // 2. If it looks like a path (absolute or relative)
    if (commandName.includes('/') || commandName.startsWith('.')) {
      return await this.resolvePathExecutable(commandName, context);
    }

    // 3. PATH search
    const pathResult = await this.searchPath(commandName, context);
    if (pathResult) return pathResult;

    return { type: 'not_found', command: null };
  }

  /**
   * Resolve an executable by path (./script.sh, /bin/cat, etc.)
   */
  private async resolvePathExecutable(
    path: string,
    context: CommandContext,
  ): Promise<ResolvedCommand> {
    const cwd = context.env.PWD || '/';
    const fullPath = resolveFsPath(path, cwd);

    try {
      const node = this.fs.getNode(fullPath, user, group, 'read');
      if (!node || node.type !== 'file') {
        return { type: 'not_found', command: null, path: fullPath };
      }

      // Executable?
      if (!FileSystem.hasPermission(node, 'execute', user, group)) {
        return { type: 'not_executable', command: null, path: fullPath };
      }

      // Mapped executable handler
      if (this.executableMap.has(fullPath)) {
        return { type: 'executable', command: this.executableMap.get(fullPath)!, path: fullPath };
      }

      // Shebang check
      const interpreter = this.parseShebang(node.content || '');
      if (interpreter) {
        return { type: 'script', command: null, path: fullPath, interpreter };
      }

      // Executable file but no mapped handler or interpreter
      return { type: 'executable', command: null, path: fullPath };
    } catch {
      return { type: 'not_found', command: null, path: fullPath };
    }
  }

  /**
   * Search PATH environment variable for executable
   */
  private async searchPath(
    commandName: string,
    context: CommandContext,
  ): Promise<ResolvedCommand | null> {
    const pathEnv = context.env.PATH || '/bin:/usr/bin';
    const paths = pathEnv.split(':').filter(Boolean);

    for (const dir of paths) {
      const candidate = resolveFsPath(`${dir}/${commandName}`, '/');

      // Direct mapping
      if (this.executableMap.has(candidate)) {
        return { type: 'executable', command: this.executableMap.get(candidate)!, path: candidate };
      }

      try {
        const node = this.fs.getNode(candidate, user, group, 'read');
        if (node && node.type === 'file') {
          if (!FileSystem.hasPermission(node, 'execute', user, group)) {
            return { type: 'not_executable', command: null, path: candidate };
          }
          const interpreter = this.parseShebang(node.content || '');
          if (interpreter) {
            return { type: 'script', command: null, path: candidate, interpreter };
          }
          return { type: 'executable', command: null, path: candidate };
        }
      } catch {
        // continue
      }
    }

    return null;
  }

  /** Parse shebang from file content */
  private parseShebang(content: string): string | null {
    if (!content.startsWith('#!')) return null;
    const firstLine = content.split('\n')[0].slice(2).trim();
    if (firstLine.startsWith('/usr/bin/env ')) {
      const parts = firstLine.slice('/usr/bin/env '.length).trim().split(/\s+/);
      return parts[0] || null;
    }
    return firstLine.split(/\s+/)[0] || null;
  }
}
