/**
 * Variable expansion utilities for shell-like environment
 * Handles $VAR, ${VAR}, and $? expansion with proper quoting rules
 */

interface VarNameResult {
  name: string;
  next: number;
}

/**
 * Read a variable name from a string starting at a given index
 */
function readVarName(s: string, idx: number): VarNameResult | null {
  if (s[idx] === '{') {
    // ${VAR}
    let j = idx + 1;
    let name = '';
    while (j < s.length && s[j] !== '}') {
      name += s[j];
      j++;
    }
    if (j < s.length && s[j] === '}') {
      return { name, next: j + 1 };
    }
    return null;
  }

  if (s[idx] === '?') {
    return { name: '?', next: idx + 1 };
  }

  let j = idx;
  let name = '';
  if (/[A-Za-z_]/.test(s[j])) {
    name += s[j];
    j++;
    while (j < s.length && /[A-Za-z0-9_]/.test(s[j])) {
      name += s[j];
      j++;
    }
    return { name, next: j };
  }

  return null;
}

/**
 * Expand variables in a token with proper quoting and escaping rules
 */
export function expandToken(token: string, env: Record<string, any>): string {
  let out = '';
  let inSingle = false;
  let inDouble = false;

  for (let i = 0; i < token.length; i++) {
    const ch = token[i];

    if (!inDouble && ch === "'") {
      inSingle = !inSingle;
      continue;
    }

    if (!inSingle && ch === '"') {
      inDouble = !inDouble;
      continue;
    }

    if (ch === '\\') {
      // Escape behavior differs by context
      if (inSingle) {
        out += ch;
        continue;
      }

      if (inDouble) {
        const next = token[i + 1];
        if (next === '"' || next === '\\' || next === '$') {
          out += next ?? '';
          i++;
          continue;
        }
        out += ch;
        continue;
      }

      if (i + 1 < token.length) {
        out += token[i + 1];
        i++;
        continue;
      }
      continue;
    }

    if (ch === '$' && !inSingle) {
      const res = readVarName(token, i + 1);
      if (res) {
        const val = env[res.name] ?? '';
        out += String(val);
        i = res.next - 1;
        continue;
      }
    }

    out += ch;
  }

  return out;
}
