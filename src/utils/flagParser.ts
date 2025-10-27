/**
 * Universal flag parser for GNU coreutils-style commands
 * Supports: -abc (short combined), --long-flag, --opt=value, -n 10
 */

export interface FlagDefinition {
  short?: string; // Single character (e.g., 'n')
  long?: string; // Long name (e.g., 'number')
  takesValue?: boolean; // Whether flag expects a value
  default?: any; // Default value if not provided
  type?: 'boolean' | 'string' | 'number';
}

export interface ParsedFlags {
  flags: Map<string, any>; // Map of flag names to values
  positional: string[]; // Non-flag arguments
  raw: Set<string>; // Raw short flags seen (e.g., 'a', 'l', 'h')
}

/**
 * Parse command-line arguments according to flag definitions
 *
 * @param args - Raw arguments array
 * @param definitions - Array of flag definitions
 * @returns Parsed flags and positional arguments
 */
export function parseFlags(args: string[], definitions: FlagDefinition[] = []): ParsedFlags {
  const flagMap = new Map<string, any>();
  const positional: string[] = [];
  const rawFlags = new Set<string>();

  // Build lookup maps for quick access
  const shortToLong = new Map<string, string>();
  const longToShort = new Map<string, string>();
  const flagDefs = new Map<string, FlagDefinition>();

  for (const def of definitions) {
    const key = def.long || def.short || '';
    flagDefs.set(key, def);

    if (def.short && def.long) {
      shortToLong.set(def.short, def.long);
      longToShort.set(def.long, def.short);
    }

    // Set defaults
    if (def.default !== undefined) {
      flagMap.set(key, def.default);
    }
  }

  let stopParsing = false;
  let i = 0;

  while (i < args.length) {
    const arg = args[i];

    // Stop parsing flags after '--'
    if (arg === '--') {
      stopParsing = true;
      i++;
      continue;
    }

    // If we've seen '--', everything else is positional
    if (stopParsing || !arg.startsWith('-') || arg === '-') {
      positional.push(arg);
      i++;
      continue;
    }

    // Long flag: --flag or --flag=value
    if (arg.startsWith('--')) {
      const eqIndex = arg.indexOf('=');
      const flagName = eqIndex !== -1 ? arg.slice(2, eqIndex) : arg.slice(2);
      const def = flagDefs.get(flagName);

      if (def && def.takesValue) {
        if (eqIndex !== -1) {
          // --flag=value
          flagMap.set(flagName, parseValue(arg.slice(eqIndex + 1), def.type));
        } else if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
          // --flag value
          i++;
          flagMap.set(flagName, parseValue(args[i], def.type));
        } else {
          // No value provided, use default or true
          flagMap.set(flagName, def.default ?? true);
        }
      } else {
        // Boolean flag or unknown
        flagMap.set(flagName, true);
      }

      // Also track by short name if exists
      const shortName = longToShort.get(flagName);
      if (shortName) {
        rawFlags.add(shortName);
      }

      i++;
      continue;
    }

    // Short flag(s): -a, -abc, -n 10
    if (arg.startsWith('-') && arg.length > 1) {
      for (let j = 1; j < arg.length; j++) {
        const shortFlag = arg[j];
        rawFlags.add(shortFlag);

        const longName = shortToLong.get(shortFlag);
        const key = longName || shortFlag;
        const def = flagDefs.get(key);

        if (def && def.takesValue) {
          // This flag takes a value
          if (j === arg.length - 1) {
            // Last char in group, value is next arg
            if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
              i++;
              flagMap.set(key, parseValue(args[i], def.type));
            } else {
              flagMap.set(key, def.default ?? true);
            }
          } else {
            // Value is rest of this arg
            flagMap.set(key, parseValue(arg.slice(j + 1), def.type));
            break;
          }
        } else {
          // Boolean flag
          flagMap.set(key, true);
        }
      }
      i++;
      continue;
    }

    // Shouldn't reach here, but treat as positional
    positional.push(arg);
    i++;
  }

  return {
    flags: flagMap,
    positional,
    raw: rawFlags,
  };
}

/**
 * Parse value according to type
 */
function parseValue(value: string, type?: 'boolean' | 'string' | 'number'): any {
  if (type === 'number') {
    const num = Number(value);
    return isNaN(num) ? value : num;
  }
  if (type === 'boolean') {
    return value.toLowerCase() === 'true' || value === '1';
  }
  return value;
}

/**
 * Simple flag parser for commands that don't need complex definitions
 * Just splits into flags and positional args
 */
export function parseSimpleFlags(args: string[]): {
  flags: Set<string>;
  positional: string[];
  longFlags: Map<string, string | true>;
} {
  const flags = new Set<string>();
  const positional: string[] = [];
  const longFlags = new Map<string, string | true>();
  let stopParsing = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--') {
      stopParsing = true;
      continue;
    }

    if (stopParsing || !arg.startsWith('-') || arg === '-') {
      positional.push(arg);
      continue;
    }

    if (arg.startsWith('--')) {
      const eqIndex = arg.indexOf('=');
      if (eqIndex !== -1) {
        longFlags.set(arg.slice(2, eqIndex), arg.slice(eqIndex + 1));
      } else {
        longFlags.set(arg.slice(2), true);
      }
      continue;
    }

    // Short flags
    for (let j = 1; j < arg.length; j++) {
      flags.add(arg[j]);
    }
  }

  return { flags, positional, longFlags };
}

/**
 * Check if a flag is present (works with both short and long names)
 */
export function hasFlag(parsed: ParsedFlags, flag: string): boolean {
  return parsed.flags.has(flag) || parsed.raw.has(flag);
}

/**
 * Get flag value with fallback
 */
export function getFlagValue<T = any>(parsed: ParsedFlags, flag: string, defaultValue?: T): T {
  return (parsed.flags.get(flag) as T) ?? (defaultValue as T);
}
