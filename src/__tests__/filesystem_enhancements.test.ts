import { describe, it, expect } from 'vitest';
import { FileSystem } from '../core/filesystem';
import { addBaseFilesystem } from '../core/addBaseFilesystem';

function fsWithBase() {
  const fs = new FileSystem();
  addBaseFilesystem(fs);
  return fs;
}

describe('Filesystem enhancements: /var/tmp and /tmp', () => {
  it('includes /var/tmp directory', () => {
    const fs = fsWithBase();
    const node = fs.getNode('/var/tmp', 'busykoala', 'busygroup', 'execute');
    expect(node).toBeTruthy();
    expect(node?.type).toBe('directory');
  });

  it('includes /tmp directory', () => {
    const fs = fsWithBase();
    const node = fs.getNode('/tmp', 'busykoala', 'busygroup', 'execute');
    expect(node).toBeTruthy();
    expect(node?.type).toBe('directory');
  });
});

describe('Filesystem enhancements: /usr tree', () => {
  it('includes /usr directory', () => {
    const fs = fsWithBase();
    const node = fs.getNode('/usr', 'busykoala', 'busygroup', 'execute');
    expect(node).toBeTruthy();
    expect(node?.type).toBe('directory');
  });

  it('includes /usr/bin directory', () => {
    const fs = fsWithBase();
    const node = fs.getNode('/usr/bin', 'busykoala', 'busygroup', 'execute');
    expect(node).toBeTruthy();
    expect(node?.type).toBe('directory');
  });

  it('includes /usr/local directory', () => {
    const fs = fsWithBase();
    const node = fs.getNode('/usr/local', 'busykoala', 'busygroup', 'execute');
    expect(node).toBeTruthy();
    expect(node?.type).toBe('directory');
  });
});

describe('Filesystem enhancements: expand /bin with simulated executables', () => {
  it('includes /bin/echo', () => {
    const fs = fsWithBase();
    const node = fs.getNode('/bin/echo', 'busykoala', 'busygroup', 'read');
    expect(node).toBeTruthy();
    expect(node?.type).toBe('file');
  });
  it('includes /bin/env', () => {
    const fs = fsWithBase();
    const node = fs.getNode('/bin/env', 'busykoala', 'busygroup', 'read');
    expect(node).toBeTruthy();
    expect(node?.type).toBe('file');
  });
  it('includes /bin/grep', () => {
    const fs = fsWithBase();
    const node = fs.getNode('/bin/grep', 'busykoala', 'busygroup', 'read');
    expect(node).toBeTruthy();
    expect(node?.type).toBe('file');
  });
});
