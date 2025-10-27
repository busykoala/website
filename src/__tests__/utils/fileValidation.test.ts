import { describe, it, expect } from 'vitest';
import { FileSystem } from '../../core/filesystem';
import { addBaseFilesystem } from '../../core/addBaseFilesystem';
import {
  pathExists,
  isDirectory,
  isFile,
  canRead,
  canWrite,
  canExecute,
  pathNotExists,
  parentDirWritable,
  validateReadableFile,
  validateDirectory,
} from '../../utils/fileValidation';

const CWD = '/home/busykoala';

describe('utils/fileValidation', () => {
  function setupFS() {
    const fs = new FileSystem();
    addBaseFilesystem(fs);
    fs.addFile(
      CWD,
      'read.txt',
      'busykoala',
      'busygroup',
      'busykoala',
      'busygroup',
      'ok',
      'rw-r--r--',
    );
    fs.addFile(
      CWD,
      'secret.txt',
      'busykoala',
      'busygroup',
      'busykoala',
      'busygroup',
      'no',
      '---------',
    );
    fs.addDirectory(CWD, 'adir', 'busykoala', 'busygroup', 'busykoala', 'busygroup');
    return fs;
  }

  it('pathExists, isFile, isDirectory basics', () => {
    const fs = setupFS();
    expect(pathExists(fs, 'read.txt', CWD).valid).toBe(true);
    expect(pathExists(fs, 'nope.txt', CWD).valid).toBe(false);

    expect(isFile(fs, 'read.txt', CWD).valid).toBe(true);
    expect(isFile(fs, 'adir', CWD).valid).toBe(false);

    expect(isDirectory(fs, 'adir', CWD).valid).toBe(true);
    expect(isDirectory(fs, 'read.txt', CWD).valid).toBe(false);
  });

  it('permission checks via canRead/canWrite/canExecute', () => {
    const fs = setupFS();
    // canRead
    expect(canRead(fs, 'read.txt', CWD).valid).toBe(true);
    expect(canRead(fs, 'secret.txt', CWD).valid).toBe(false);

    // canWrite: create a non-writable dir
    fs.addDirectory(
      CWD,
      'nowrite',
      'busykoala',
      'busygroup',
      'busykoala',
      'busygroup',
      'r-xr-xr-x',
    );
    expect(canWrite(fs, 'nowrite', CWD).valid).toBe(false);

    // canExecute
    fs.addFile(
      CWD,
      'run.sh',
      'busykoala',
      'busygroup',
      'busykoala',
      'busygroup',
      '#!/bin/sh\n',
      'rwxr-xr-x',
    );
    expect(canExecute(fs, 'run.sh', CWD).valid).toBe(true);
    fs.addFile(
      CWD,
      'plain.txt',
      'busykoala',
      'busygroup',
      'busykoala',
      'busygroup',
      'x',
      'rw-r--r--',
    );
    expect(canExecute(fs, 'plain.txt', CWD).valid).toBe(false);
  });

  it('pathNotExists and parentDirWritable', () => {
    const fs = setupFS();
    expect(pathNotExists(fs, 'new.txt', CWD).valid).toBe(true);
    expect(pathNotExists(fs, 'read.txt', CWD).valid).toBe(false);

    // Parent dir writable for home
    expect(parentDirWritable(fs, 'new2.txt', CWD).valid).toBe(true);

    // Parent dir not writable
    fs.addDirectory(
      CWD,
      'nowrite',
      'busykoala',
      'busygroup',
      'busykoala',
      'busygroup',
      'r-xr-xr-x',
    );
    expect(parentDirWritable(fs, 'nowrite/new3.txt', CWD).valid).toBe(false);
  });

  it('validateReadableFile and validateDirectory produce proper outcomes', () => {
    const fs = setupFS();
    const ok = validateReadableFile('cat', fs, 'read.txt', CWD);
    expect(ok.error).toBeUndefined();
    expect(ok.node?.type).toBe('file');

    const missing = validateReadableFile('cat', fs, 'nope.txt', CWD);
    expect(String(missing.error)).toMatch(/No such file/);

    const isDir = validateReadableFile('cat', fs, 'adir', CWD);
    expect(String(isDir.error)).toMatch(/Is a directory/);

    const denied = validateReadableFile('cat', fs, 'secret.txt', CWD);
    expect(String(denied.error)).toMatch(/Permission denied/);

    const dOk = validateDirectory('ls', fs, 'adir', CWD);
    expect(dOk.error).toBeUndefined();

    const dBad = validateDirectory('ls', fs, 'read.txt', CWD);
    expect(String(dBad.error)).toMatch(/Not a directory/);
  });
});
