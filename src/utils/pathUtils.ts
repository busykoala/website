/**
 * Path manipulation utilities for filesystem operations
 * Provides POSIX-like path operations
 */

/**
 * Resolve a relative path to an absolute path given the current working directory
 */
export function resolvePath(path: string, cwd: string): string {
  if (isAbsolutePath(path)) {
    return normalizePath(path);
  }

  // Relative path - combine with cwd
  return normalizePath(joinPath(cwd, path));
}

/**
 * Normalize a path by resolving . and .. segments
 */
export function normalizePath(path: string): string {
  // Preserve exact root and handle empty input explicitly
  if (path === '') return '.';
  if (path === '/') return '/';

  const isAbs = path.startsWith('/');
  const parts = path.split('/').filter((p) => p !== '' && p !== '.');
  const stack: string[] = [];

  for (const part of parts) {
    if (part === '..') {
      if (stack.length > 0 && stack[stack.length - 1] !== '..') {
        stack.pop();
      } else if (!isAbs) {
        stack.push('..');
      }
    } else {
      stack.push(part);
    }
  }

  let result = isAbs ? '/' + stack.join('/') : stack.join('/');
  if (!result) result = isAbs ? '/' : '.';

  return result;
}

/**
 * Check if a path is absolute
 */
export function isAbsolutePath(path: string): boolean {
  return path.startsWith('/');
}

/**
 * Get the directory name of a path
 */
export function dirname(path: string): string {
  if (!path || path === '/') return '/';

  // Remove trailing slashes
  path = path.replace(/\/+$/, '');

  const lastSlash = path.lastIndexOf('/');
  if (lastSlash === -1) return '.';
  if (lastSlash === 0) return '/';

  return path.slice(0, lastSlash);
}

/**
 * Get the base name of a path
 */
export function basename(path: string, suffix?: string): string {
  if (!path || path === '/') return path;

  // Remove trailing slashes
  path = path.replace(/\/+$/, '');

  const lastSlash = path.lastIndexOf('/');
  let base = lastSlash === -1 ? path : path.slice(lastSlash + 1);

  // Remove suffix if provided
  if (suffix && base.endsWith(suffix)) {
    base = base.slice(0, -suffix.length);
  }

  return base;
}

/**
 * Join path segments
 */
export function joinPath(...parts: string[]): string {
  if (parts.length === 0) return '.';

  // Filter out empty parts and join with /
  const filtered = parts.filter((p) => p !== '');
  if (filtered.length === 0) return '.';

  const joined = filtered.join('/');
  return normalizePath(joined);
}

/**
 * Get the extension of a file path
 */
export function extname(path: string): string {
  const base = basename(path);
  const lastDot = base.lastIndexOf('.');

  if (lastDot === -1 || lastDot === 0) return '';
  return base.slice(lastDot);
}

/**
 * Split a path into directory and file parts
 */
export function splitPath(path: string): { dir: string; base: string } {
  return {
    dir: dirname(path),
    base: basename(path),
  };
}

/**
 * Check if a path is a descendant of another path
 */
export function isDescendant(child: string, parent: string): boolean {
  const normalizedChild = normalizePath(child);
  const normalizedParent = normalizePath(parent);

  if (normalizedChild === normalizedParent) return false;

  return normalizedChild.startsWith(normalizedParent + '/');
}

/**
 * Get relative path from 'from' to 'to'
 */
export function relativePath(from: string, to: string): string {
  const fromParts = normalizePath(from)
    .split('/')
    .filter((p) => p);
  const toParts = normalizePath(to)
    .split('/')
    .filter((p) => p);

  // Find common prefix
  let commonLength = 0;
  while (
    commonLength < fromParts.length &&
    commonLength < toParts.length &&
    fromParts[commonLength] === toParts[commonLength]
  ) {
    commonLength++;
  }

  // Build relative path
  const upCount = fromParts.length - commonLength;
  const relativeParts = Array(upCount).fill('..');
  relativeParts.push(...toParts.slice(commonLength));

  return relativeParts.length === 0 ? '.' : relativeParts.join('/');
}

/**
 * Expand ~ to home directory
 */
export function expandHome(path: string, homeDir: string): string {
  if (path === '~') return homeDir;
  if (path.startsWith('~/')) return homeDir + path.slice(1);
  return path;
}

/**
 * Replace home directory with ~
 */
export function collapseHome(path: string, homeDir: string): string {
  if (path === homeDir) return '~';
  if (path.startsWith(homeDir + '/')) {
    return '~' + path.slice(homeDir.length);
  }
  return path;
}
