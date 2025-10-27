import { describe, it, expect } from 'vitest';
import { FileSystem } from '../core/filesystem';
import { addBaseFilesystem, getBuiltinExecutableMap } from '../core/addBaseFilesystem';
import { binMappings } from '../core/data/binFiles';

describe('addBaseFilesystem - /bin and /usr/bin seeding', () => {
  it('creates /bin and /usr/bin entries for all built-in commands', () => {
    const fs = new FileSystem();
    addBaseFilesystem(fs);

    for (const m of binMappings) {
      const binNode = fs.getNode(m.binPath, 'root', 'root', 'read');
      const usrNode = fs.getNode(m.usrBinPath, 'root', 'root', 'read');
      expect(binNode && binNode.type === 'file').toBe(true);
      expect(usrNode && usrNode.type === 'file').toBe(true);
    }
  });

  it('seeds missing builtins like history and help with executable permissions', () => {
    const fs = new FileSystem();
    addBaseFilesystem(fs);

    const targets = ['/bin/history', '/usr/bin/history', '/bin/help', '/usr/bin/help'];
    for (const p of targets) {
      const node = fs.getNode(p, 'root', 'root', 'read');
      expect(node && node.type === 'file').toBe(true);
      // Owner execute bit should be allowed
      // FileSystem.hasPermission requires node and user/group; re-importing here avoided; simple check on permissions string
      expect(node!.permissions[2] !== '-').toBe(true);
    }
  });

  it('exposes builtin executable mapping for both /bin and /usr/bin', () => {
    const mapping = getBuiltinExecutableMap();
    expect(mapping.get('/bin/echo')).toBe('echo');
    expect(mapping.get('/usr/bin/echo')).toBe('echo');
    // spot-check a few more
    expect(mapping.get('/bin/ls')).toBe('ls');
    expect(mapping.get('/usr/bin/ls')).toBe('ls');
  });
});
