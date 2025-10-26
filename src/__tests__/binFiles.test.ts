import { describe, it, expect } from 'vitest';
import {
  builtins,
  binMappings,
  builtinsSet,
  getBinPath,
  getUsrBinPath,
} from '../core/data/binFiles';

describe('binFiles mappings', () => {
  it('includes expected core builtins', () => {
    const expected = [
      'echo',
      'ls',
      'cat',
      'grep',
      'head',
      'tail',
      'wc',
      'pwd',
      'mkdir',
      'mv',
      'rm',
      'touch',
    ];
    for (const name of expected) {
      expect(builtinsSet.has(name as any)).toBe(true);
    }
  });

  it('has unique one-to-one mappings', () => {
    const names = new Set(builtins);
    expect(names.size).toBe(builtins.length);

    const binPaths = new Set(binMappings.map((m) => m.binPath));
    const usrPaths = new Set(binMappings.map((m) => m.usrBinPath));
    expect(binPaths.size).toBe(binMappings.length);
    expect(usrPaths.size).toBe(binMappings.length);
  });

  it('builds correct /bin and /usr/bin paths', () => {
    expect(getBinPath('echo' as any)).toBe('/bin/echo');
    expect(getUsrBinPath('echo' as any)).toBe('/usr/bin/echo');
    expect(getBinPath('ls' as any)).toBe('/bin/ls');
    expect(getUsrBinPath('ls' as any)).toBe('/usr/bin/ls');
  });

  it('binMappings mirror builtins content', () => {
    const mappedNames = new Set(binMappings.map((m) => m.name));
    const builtinNames = new Set(builtins);
    expect(mappedNames.size).toBe(builtinNames.size);
    for (const n of builtinNames) {
      expect(mappedNames.has(n)).toBe(true);
    }
  });
});
