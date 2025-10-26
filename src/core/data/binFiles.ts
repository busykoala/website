/**
 * binFiles - Declarative mapping of built-in commands to /bin with /usr/bin aliases.
 * This does not modify the filesystem directly. addBaseFilesystem (next task)
 * will consume these mappings to seed files and optional symlink/alias entries.
 */

export type BuiltinName =
  | 'cat'
  | 'cd'
  | 'chmod'
  | 'chown'
  | 'clear'
  | 'cmatrix'
  | 'cowsay'
  | 'cp'
  | 'date'
  | 'df'
  | 'du'
  | 'echo'
  | 'env'
  | 'export'
  | 'find'
  | 'fortune'
  | 'grep'
  | 'head'
  | 'help'
  | 'history'
  | 'hostname'
  | 'id'
  | 'ls'
  | 'mkdir'
  | 'mv'
  | 'pwd'
  | 'rm'
  | 'sl'
  | 'tail'
  | 'touch'
  | 'tree'
  | 'uname'
  | 'unset'
  | 'wc'
  | 'whoami';

export const builtins: BuiltinName[] = [
  'cat',
  'cd',
  'chmod',
  'chown',
  'clear',
  'cmatrix',
  'cowsay',
  'cp',
  'date',
  'df',
  'du',
  'echo',
  'env',
  'export',
  'find',
  'fortune',
  'grep',
  'head',
  'help',
  'history',
  'hostname',
  'id',
  'ls',
  'mkdir',
  'mv',
  'pwd',
  'rm',
  'sl',
  'tail',
  'touch',
  'tree',
  'uname',
  'unset',
  'wc',
  'whoami',
];

export interface BinMapping {
  name: BuiltinName;
  binPath: string; // e.g., /bin/echo
  usrBinPath: string; // e.g., /usr/bin/echo (alias)
}

export const binMappings: BinMapping[] = builtins.map((name) => ({
  name,
  binPath: `/bin/${name}`,
  usrBinPath: `/usr/bin/${name}`,
}));

export const builtinsSet = new Set<BuiltinName>(builtins);

export function getBinPath(name: BuiltinName): string {
  return `/bin/${name}`;
}

export function getUsrBinPath(name: BuiltinName): string {
  return `/usr/bin/${name}`;
}
