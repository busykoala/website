import { group, user } from './TerminalCore';
import { busykoalaFiles } from './data/busykoalaFiles';
import { baseFiles } from './data/baseFiles';
import { FileSystemNode } from './filesystem';
import { FileSystem } from './filesystem';
import { binMappings } from './data/binFiles';

export interface InitFileSystemNode extends FileSystemNode {
  directory: string;
}

export function addBaseFilesystem(fileSystem: FileSystem) {
  const allFiles: InitFileSystemNode[] = [...baseFiles, ...busykoalaFiles];

  // Define directories to create with their ownership
  const directories = [
    { path: '/bin', owner: 'root', group: 'root' },
    { path: '/etc', owner: 'root', group: 'root' },
    { path: '/boot', owner: 'root', group: 'root' },
    { path: '/lib', owner: 'root', group: 'root' },
    { path: '/var', owner: 'root', group: 'root' },
    { path: '/var/log', owner: 'root', group: 'root' },
    { path: '/var/tmp', owner: 'root', group: 'root' },
    { path: '/tmp', owner: 'root', group: 'root' },
    { path: '/usr', owner: 'root', group: 'root' },
    { path: '/usr/bin', owner: 'root', group: 'root' },
    { path: '/usr/local', owner: 'root', group: 'root' },
    { path: '/dev', owner: 'root', group: 'root' },
    { path: '/proc', owner: 'root', group: 'root' },
    { path: '/home', owner: 'root', group: 'root' },
    { path: '/home/busykoala', owner: user, group },
    { path: '/home/busykoala/about', owner: user, group },
    { path: '/home/busykoala/.ssh', owner: user, group },
  ];

  // Create all directories with bypass permissions
  directories.forEach(({ path, owner, group }) => {
    const segments = path.split('/').filter(Boolean);
    let currentPath = '';
    segments.forEach((segment) => {
      const parentPath = currentPath || '/';
      currentPath = `${parentPath}/${segment}`.replace(/\/+/, '/');

      try {
        fileSystem.addDirectory(
          parentPath,
          segment,
          owner,
          group,
          owner,
          group,
          'rwxr-xr-x',
          true, // Bypass permissions
        );
      } catch {
        // Silently handle existing directories
      }
    });
  });

  // Add files to the filesystem
  allFiles.forEach((file) => {
    try {
      fileSystem.addFile(
        file.directory,
        file.name,
        file.owner,
        file.group,
        file.owner,
        file.group,
        file.content || '',
        file.permissions || 'rw-r--r--',
        false,
        true, // Bypass permissions
      );
    } catch (error) {
      console.error(
        `Failed to add file '${file.name}' in '${file.directory}': ${(error as Error).message}`,
      );
    }
  });

  // Seed /bin and /usr/bin entries for built-in commands.
  // If an entry already exists (from base files), keep it; otherwise create a minimal executable placeholder.
  for (const m of binMappings) {
    try {
      // Ensure /bin/<name>
      try {
        fileSystem.getNode(m.binPath, 'root', 'root', 'read');
      } catch {
        const dir = m.binPath.substring(0, m.binPath.lastIndexOf('/')) || '/';
        const name = m.binPath.substring(m.binPath.lastIndexOf('/') + 1);
        fileSystem.addFile(
          dir,
          name,
          'root',
          'root',
          'root',
          'root',
          `builtin:${m.name}\n`,
          'rwxr-xr-x',
          false,
          true,
        );
      }

      // Ensure /usr/bin/<name>
      try {
        fileSystem.getNode(m.usrBinPath, 'root', 'root', 'read');
      } catch {
        const dir = m.usrBinPath.substring(0, m.usrBinPath.lastIndexOf('/')) || '/';
        const name = m.usrBinPath.substring(m.usrBinPath.lastIndexOf('/') + 1);
        fileSystem.addFile(
          dir,
          name,
          'root',
          'root',
          'root',
          'root',
          `builtin:${m.name}\n`,
          'rwxr-xr-x',
          false,
          true,
        );
      }
    } catch {
      // ignore seeding failures to keep base FS robust
    }
  }

  // Add example scripts in home directory
  try {
    fileSystem.addFile(
      '/home/busykoala',
      'hello.sh',
      user,
      group,
      user,
      group,
      '#!/bin/sh\necho Hello from script\n',
      'rwxr-xr-x',
      false,
      true,
    );
    fileSystem.addFile(
      '/home/busykoala',
      'greet.sh',
      user,
      group,
      user,
      group,
      '#!/bin/sh\necho "Hello, $1"\n',
      'rwxr-xr-x',
      false,
      true,
    );
    fileSystem.addFile(
      '/home/busykoala',
      'count.sh',
      user,
      group,
      user,
      group,
      '#!/bin/sh\necho 1\necho 2\necho 3\n',
      'rwxr-xr-x',
      false,
      true,
    );
  } catch {}

  // Add minimal device files
  try {
    fileSystem.addFile(
      '/dev',
      'null',
      'root',
      'root',
      'root',
      'root',
      '',
      'rw-rw-rw-',
      false,
      true,
    );
  } catch {}

  // Add basic /proc virtual files (static content for simulation)
  try {
    fileSystem.addFile(
      '/proc',
      'cpuinfo',
      'root',
      'root',
      'root',
      'root',
      [
        'processor\t: 0',
        'vendor_id\t: GenuineIntel',
        'model name\t: BusyKoala CPU',
        'cpu MHz\t\t: 2400.000',
        'flags\t\t: fpu sse sse2 sse3 ssse3 sse4_2 avx avx2',
      ].join('\n') + '\n',
      'r--r--r--',
      false,
      true,
    );
    fileSystem.addFile(
      '/proc',
      'meminfo',
      'root',
      'root',
      'root',
      'root',
      [
        'MemTotal:       16384 kB',
        'MemFree:        8192 kB',
        'Buffers:        1024 kB',
        'Cached:         2048 kB',
      ].join('\n') + '\n',
      'r--r--r--',
      false,
      true,
    );
    fileSystem.addFile(
      '/proc',
      'uptime',
      'root',
      'root',
      'root',
      'root',
      '12345.67 89012.34\n',
      'r--r--r--',
      false,
      true,
    );
    fileSystem.addFile(
      '/proc',
      'version',
      'root',
      'root',
      'root',
      'root',
      'Linux version 5.10.0 (busykoala@local) (gcc version 12.2.0) #1 SMP BusyKoala GNU/Linux\n',
      'r--r--r--',
      false,
      true,
    );
    fileSystem.addFile(
      '/proc',
      'loadavg',
      'root',
      'root',
      'root',
      'root',
      '0.00 0.01 0.05 1/100 1234\n',
      'r--r--r--',
      false,
      true,
    );
    fileSystem.addFile(
      '/proc',
      'stat',
      'root',
      'root',
      'root',
      'root',
      [
        'cpu  12234 0 5678 901234 0 0 0 0 0 0',
        'intr 0',
        'ctxt 123456',
        'btime 1609459200',
        'processes 42',
      ].join('\n') + '\n',
      'r--r--r--',
      false,
      true,
    );
  } catch {}
}

// Provide a simple path->command mapping for seeded built-ins
export function getBuiltinExecutableMap(): Map<string, string> {
  const m = new Map<string, string>();
  for (const bm of binMappings) {
    m.set(bm.binPath, bm.name);
    m.set(bm.usrBinPath, bm.name);
  }
  return m;
}
