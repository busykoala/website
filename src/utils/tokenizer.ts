/**
 * Shell tokenizer utilities
 * Handles quoting, escaping, and special operators like here-strings
 */

export interface TokenizeResult {
  tokens: string[];
  ops?: Array<{ type: 'hereString'; value: string }>;
}

/**
 * Check if a string contains unquoted glob characters (* or ?)
 */
export function hasUnquotedGlob(str: string): boolean {
  let inSingle = false;
  let inDouble = false;

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (!inDouble && ch === "'") {
      inSingle = !inSingle;
      continue;
    }
    if (!inSingle && ch === '"') {
      inDouble = !inDouble;
      continue;
    }
    if (!inSingle && !inDouble && (ch === '*' || ch === '?')) {
      return true;
    }
  }
  return false;
}

/**
 * Strip outer quotes from a string if present
 */
export function stripOuterQuotes(s: string): string {
  if (s.length >= 2) {
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
      return s.slice(1, -1);
    }
  }
  return s;
}

/**
 * Tokenize shell input with quoting/escaping support
 */
export function tokenize(input: string, withOperators: boolean = false): TokenizeResult {
  const tokens: string[] = [];
  const ops: Array<{ type: 'hereString'; value: string }> = [];

  let i = 0;
  let cur = '';
  let inSingle = false;
  let inDouble = false;

  const pushToken = () => {
    if (cur.length > 0) {
      tokens.push(cur);
      cur = '';
    }
  };

  const skipSpaces = () => {
    while (i < input.length && /\s/.test(input[i]!)) i++;
  };

  const readWordRaw = (): string => {
    let out = '';
    let sInSingle = false;
    let sInDouble = false;
    while (i < input.length) {
      const ch = input[i]!;
      if (!sInDouble && ch === "'") {
        out += ch;
        sInSingle = !sInSingle;
        i++;
        continue;
      }
      if (!sInSingle && ch === '"') {
        out += ch;
        sInDouble = !sInDouble;
        i++;
        continue;
      }
      if (!sInSingle && !sInDouble && /\s/.test(ch)) break;
      if (ch === '\\' && !sInSingle) {
        if (i + 1 < input.length) {
          out += ch + input[i + 1];
          i += 2;
          continue;
        }
      }
      out += ch;
      i++;
    }
    return out;
  };

  while (i < input.length) {
    const ch = input[i]!;

    // Here-string detection: unquoted <<< WORD
    if (withOperators && !inSingle && !inDouble && input.startsWith('<<<', i)) {
      pushToken();
      i += 3;
      skipSpaces();
      const raw = readWordRaw();
      if (raw.length === 0) {
        cur += '<<<';
        continue;
      }
      ops.push({ type: 'hereString', value: raw });
      continue;
    }

    if (!inSingle && !inDouble && /\s/.test(ch)) {
      pushToken();
      i++;
      while (i < input.length && /\s/.test(input[i]!)) i++;
      continue;
    }

    if (!inDouble && ch === "'") {
      inSingle = !inSingle;
      cur += ch;
      i++;
      continue;
    }
    if (!inSingle && ch === '"') {
      inDouble = !inDouble;
      cur += ch;
      i++;
      continue;
    }

    if (ch === '\\' && !inSingle) {
      if (i + 1 < input.length) {
        cur += ch + input[i + 1];
        i += 2;
        continue;
      }
      cur += ch;
      i++;
      continue;
    }

    cur += ch;
    i++;
  }

  pushToken();

  return withOperators ? { tokens, ops } : { tokens };
}
