/**
 * Common file and directory validation utilities
 * Reduces duplication across command implementations
 */

import { FileSystem, FileSystemNode } from '../core/filesystem';
import { resolvePath } from './pathUtils';
import * as Errors from './errorMessages';
import { user, group } from '../core/TerminalCore';

export interface ValidationResult {
  valid: boolean;
  error?: string;
  node?: FileSystemNode;
}

/** Check if a path exists */
export function pathExists(fs: FileSystem, path: string, cwd: string): ValidationResult {
  const absPath = resolvePath(path, cwd);
  try {
    const node = fs.getNode(absPath, user, group, 'read');
    return node ? { valid: true, node } : { valid: false, error: `no such file or directory` };
  } catch {
    return { valid: false, error: `no such file or directory` };
  }
}

/** Check if a path is a directory */
export function isDirectory(fs: FileSystem, path: string, cwd: string): ValidationResult {
  const result = pathExists(fs, path, cwd);
  if (!result.valid) return result;
  if (result.node?.type !== 'directory') {
    return { valid: false, error: `Not a directory`, node: result.node };
  }
  return result;
}

/** Check if a path is a file */
export function isFile(fs: FileSystem, path: string, cwd: string): ValidationResult {
  const result = pathExists(fs, path, cwd);
  if (!result.valid) return result;
  if (result.node?.type !== 'file') {
    return { valid: false, error: `Is a directory`, node: result.node };
  }
  return result;
}

/** Check if user has read permission on a file/directory */
export function canRead(fs: FileSystem, path: string, cwd: string): ValidationResult {
  const res = pathExists(fs, path, cwd);
  if (!res.valid) return res;
  const node = res.node!;
  const ok = FileSystem.hasPermission(node, 'read', user, group);
  return ok ? res : { valid: false, error: `Permission denied`, node };
}

/** Check if user has write permission on a file/directory */
export function canWrite(fs: FileSystem, path: string, cwd: string): ValidationResult {
  const res = pathExists(fs, path, cwd);
  if (!res.valid) return res;
  const node = res.node!;
  const ok = FileSystem.hasPermission(node, 'write', user, group);
  return ok ? res : { valid: false, error: `Permission denied`, node };
}

/** Check if user has execute permission on a file/directory */
export function canExecute(fs: FileSystem, path: string, cwd: string): ValidationResult {
  const res = pathExists(fs, path, cwd);
  if (!res.valid) return res;
  const node = res.node!;
  const ok = FileSystem.hasPermission(node, 'execute', user, group);
  return ok ? res : { valid: false, error: `Permission denied`, node };
}

/** Validate that a path doesn't exist (for creation operations) */
export function pathNotExists(fs: FileSystem, path: string, cwd: string): ValidationResult {
  const absPath = resolvePath(path, cwd);
  try {
    const node = fs.getNode(absPath, user, group, 'read');
    if (node) {
      return { valid: false, error: `File exists`, node };
    }
  } catch {
    // not found is valid
    return { valid: true };
  }
  return { valid: false, error: `File exists` };
}

/** Validate parent directory exists and is writable */
export function parentDirWritable(fs: FileSystem, path: string, cwd: string): ValidationResult {
  const absPath = resolvePath(path, cwd);
  const parentPath = absPath.substring(0, absPath.lastIndexOf('/')) || '/';
  const parentRes = isDirectory(fs, parentPath, '/');
  if (!parentRes.valid) {
    return { valid: false, error: `Parent directory does not exist` };
  }
  const writable = canWrite(fs, parentPath, '/');
  if (!writable.valid) {
    return { valid: false, error: `Cannot write to parent directory: Permission denied` };
  }
  return { valid: true };
}

/** Validate file is readable */
export function validateReadableFile(
  cmd: string,
  fs: FileSystem,
  path: string,
  cwd: string,
): { error?: string; node?: FileSystemNode } {
  const existsResult = pathExists(fs, path, cwd);
  if (!existsResult.valid) {
    return { error: Errors.fileNotFound(cmd, path) };
  }
  const fileResult = isFile(fs, path, cwd);
  if (!fileResult.valid) {
    return { error: Errors.isDirectory(cmd, path) };
  }
  const readResult = canRead(fs, path, cwd);
  if (!readResult.valid) {
    return { error: Errors.permissionDenied(cmd, path) };
  }
  return { node: readResult.node };
}

/** Validate directory exists and is accessible */
export function validateDirectory(
  cmd: string,
  fs: FileSystem,
  path: string,
  cwd: string,
): { error?: string; node?: FileSystemNode } {
  const existsResult = pathExists(fs, path, cwd);
  if (!existsResult.valid) {
    return { error: Errors.fileNotFound(cmd, path) };
  }
  const dirResult = isDirectory(fs, path, cwd);
  if (!dirResult.valid) {
    return { error: Errors.notDirectory(cmd, path) };
  }
  return { node: dirResult.node };
}
