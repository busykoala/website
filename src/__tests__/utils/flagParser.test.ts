import { describe, it, expect } from 'vitest';
import {
  parseFlags,
  parseSimpleFlags,
  hasFlag,
  getFlagValue,
  type FlagDefinition,
} from '../../utils/flagParser';

describe('flagParser', () => {
  describe('parseFlags', () => {
    it('should parse short boolean flags', () => {
      const defs: FlagDefinition[] = [{ short: 'a' }, { short: 'b' }, { short: 'c' }];

      const result = parseFlags(['-a', '-b'], defs);

      expect(result.flags.get('a')).toBe(true);
      expect(result.flags.get('b')).toBe(true);
      expect(result.flags.get('c')).toBeUndefined();
      expect(result.positional).toEqual([]);
    });

    it('should parse combined short flags', () => {
      const defs: FlagDefinition[] = [{ short: 'a' }, { short: 'l' }, { short: 'h' }];

      const result = parseFlags(['-lah'], defs);

      expect(result.raw.has('l')).toBe(true);
      expect(result.raw.has('a')).toBe(true);
      expect(result.raw.has('h')).toBe(true);
    });

    it('should parse long flags', () => {
      const defs: FlagDefinition[] = [{ long: 'verbose' }, { long: 'debug' }];

      const result = parseFlags(['--verbose', '--debug'], defs);

      expect(result.flags.get('verbose')).toBe(true);
      expect(result.flags.get('debug')).toBe(true);
    });

    it('should parse flags with values', () => {
      const defs: FlagDefinition[] = [
        { short: 'n', long: 'number', takesValue: true, type: 'number' },
        { short: 'o', long: 'output', takesValue: true, type: 'string' },
      ];

      const result = parseFlags(['-n', '10', '--output=file.txt'], defs);

      expect(result.flags.get('number')).toBe(10);
      expect(result.flags.get('output')).toBe('file.txt');
    });

    it('should handle positional arguments', () => {
      const defs: FlagDefinition[] = [{ short: 'a' }];

      const result = parseFlags(['-a', 'file1.txt', 'file2.txt'], defs);

      expect(result.flags.get('a')).toBe(true);
      expect(result.positional).toEqual(['file1.txt', 'file2.txt']);
    });

    it('should stop parsing flags after --', () => {
      const defs: FlagDefinition[] = [{ short: 'a' }];

      const result = parseFlags(['-a', '--', '-b', 'file.txt'], defs);

      expect(result.flags.get('a')).toBe(true);
      expect(result.positional).toEqual(['-b', 'file.txt']);
    });

    it('should use default values', () => {
      const defs: FlagDefinition[] = [
        { short: 'n', long: 'number', takesValue: true, default: 10 },
      ];

      const result = parseFlags([], defs);

      expect(result.flags.get('number')).toBe(10);
    });

    it('should map short to long names', () => {
      const defs: FlagDefinition[] = [{ short: 'n', long: 'number', takesValue: true }];

      const result = parseFlags(['-n', '5'], defs);

      expect(result.flags.get('number')).toBe('5');
      expect(result.raw.has('n')).toBe(true);
    });

    it('should handle flag with value in same argument', () => {
      const defs: FlagDefinition[] = [{ short: 'n', takesValue: true, type: 'number' }];

      const result = parseFlags(['-n5'], defs);

      expect(result.flags.get('n')).toBe(5);
    });
  });

  describe('parseSimpleFlags', () => {
    it('should parse simple short flags', () => {
      const result = parseSimpleFlags(['-lah', 'file.txt']);

      expect(result.flags.has('l')).toBe(true);
      expect(result.flags.has('a')).toBe(true);
      expect(result.flags.has('h')).toBe(true);
      expect(result.positional).toEqual(['file.txt']);
    });

    it('should parse long flags', () => {
      const result = parseSimpleFlags(['--verbose', '--color=always']);

      expect(result.longFlags.get('verbose')).toBe(true);
      expect(result.longFlags.get('color')).toBe('always');
    });

    it('should stop at --', () => {
      const result = parseSimpleFlags(['-a', '--', '-b']);

      expect(result.flags.has('a')).toBe(true);
      expect(result.positional).toEqual(['-b']);
    });
  });

  describe('hasFlag', () => {
    it('should check for flag presence', () => {
      const defs: FlagDefinition[] = [{ short: 'a', long: 'all' }];

      const result = parseFlags(['-a'], defs);

      expect(hasFlag(result, 'all')).toBe(true);
      expect(hasFlag(result, 'a')).toBe(true);
      expect(hasFlag(result, 'b')).toBe(false);
    });
  });

  describe('getFlagValue', () => {
    it('should get flag value with default', () => {
      const defs: FlagDefinition[] = [{ short: 'n', takesValue: true }];

      const result = parseFlags(['-n', '10'], defs);

      expect(getFlagValue(result, 'n', 5)).toBe('10');
      expect(getFlagValue(result, 'x', 5)).toBe(5);
    });
  });
});
