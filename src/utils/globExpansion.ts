/**
 * Glob expansion utilities
 * Handles wildcard pattern matching (* and ?) in file paths
 */

import { FileSystem } from '../core/filesystem';

/**
 * Expand glob patterns in a token
 * Only expands patterns in the last path segment (filename part)
 */
export function expandGlobs(
  expandedToken: string,
  fs: FileSystem,
  cwd: string,
  user: string,
  group: string,
): string[] {
  const lastSlash = expandedToken.lastIndexOf('/');
  const dirPart = lastSlash >= 0 ? expandedToken.slice(0, lastSlash + 1) : '';
  const pattern = lastSlash >= 0 ? expandedToken.slice(lastSlash + 1) : expandedToken;

  // Don't expand globs in directory part
  if (/[*?]/.test(dirPart)) {
    return [expandedToken];
  }

  // Determine base directory for search
  const baseDir = dirPart.startsWith('/')
    ? fs.normalizePath(dirPart)
    : fs.normalizePath(`${cwd}/${dirPart}`);

  try {
    const entries = fs.listDirectory(baseDir, user, group);
    const regex = createGlobRegex(pattern);
    const matches = entries
      .filter((e) => regex.test(e.name))
      .map((e) => (dirPart || '') + e.name)
      .sort((a, b) => a.localeCompare(b));

    return matches.length ? matches : [expandedToken];
  } catch {
    return [expandedToken];
  }
}

/**
 * Convert a glob pattern to a RegExp
 */
function createGlobRegex(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+^${}()|\[\]\\]/g, (r) => '\\' + r)
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  return new RegExp('^' + escaped + '$');
}
