/**
 * Text processing helpers for shell-like commands
 * - escape sequence parsing (echo -e)
 * - variable expansion using environment map
 * - quote stripping utility
 */

export function parseEscapeSequences(str: string): { text: string; stopped: boolean } {
  let result = '';
  let i = 0;
  let stopped = false;
  while (i < str.length) {
    if (str[i] === '\\' && i + 1 < str.length) {
      const next = str[i + 1];
      switch (next) {
        case 'a':
          result += '\x07';
          i += 2;
          break;
        case 'b':
          result += '\b';
          i += 2;
          break;
        case 'c': // produce no further output
          stopped = true;
          return { text: result, stopped };
        case 'e':
          result += '\x1b';
          i += 2;
          break;
        case 'f':
          result += '\f';
          i += 2;
          break;
        case 'n':
          result += '\n';
          i += 2;
          break;
        case 'r':
          result += '\r';
          i += 2;
          break;
        case 't':
          result += '\t';
          i += 2;
          break;
        case 'v':
          result += '\v';
          i += 2;
          break;
        case '\\':
          result += '\\';
          i += 2;
          break;
        case 'x': {
          // Hex sequence up to 2 hex digits
          let hexStr = '';
          let k = i + 2;
          while (k < str.length && k < i + 4 && /[0-9A-Fa-f]/.test(str[k])) {
            hexStr += str[k];
            k++;
          }
          if (hexStr) {
            result += String.fromCharCode(parseInt(hexStr, 16));
            i = k;
          } else {
            result += str[i];
            i++;
          }
          break;
        }
        default: {
          // Octal sequence up to 3 digits [0-7]
          if (/[0-7]/.test(next)) {
            let octalStr = '';
            let j = i + 1;
            while (j < str.length && j < i + 4 && /[0-7]/.test(str[j])) {
              octalStr += str[j];
              j++;
            }
            if (octalStr) {
              result += String.fromCharCode(parseInt(octalStr, 8));
              i = j;
            } else {
              result += str[i];
              i++;
            }
          } else {
            // Not a recognized escape: keep as-is (backslash + char)
            result += str[i];
            i++;
          }
        }
      }
    } else {
      result += str[i];
      i++;
    }
  }
  return { text: result, stopped };
}

export function expandVariables(input: string, env: Record<string, any>): string {
  // Protect escaped dollars (\\$) so they stay literal
  const PH = '\u0000DOLLAR\u0000';
  let s = input.replace(/\\\$/g, PH);
  // ${VAR}
  s = s.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)}/g, (_, n) => env[n] ?? '');
  // $? special parameter (last exit status)
  s = s.replace(/(^|[^$])\$\?/g, (_, p) => `${p}${env['?'] ?? ''}`);
  // $VAR (ensure not preceded by another $ in a variable like $$)
  s = s.replace(/(^|[^$])\$([A-Za-z_][A-Za-z0-9_]*)/g, (_, p, n) => `${p}${env[n] ?? ''}`);
  // Restore escaped dollars
  s = s.replace(new RegExp(PH, 'g'), '$');
  return s;
}

export function stripEnclosingQuotes(arg: string): {
  text: string;
  quote: 'single' | 'double' | 'none';
} {
  if (arg.length >= 2 && arg.startsWith("'") && arg.endsWith("'")) {
    return { text: arg.slice(1, -1), quote: 'single' };
  }
  if (arg.length >= 2 && arg.startsWith('"') && arg.endsWith('"')) {
    return { text: arg.slice(1, -1), quote: 'double' };
  }
  return { text: arg, quote: 'none' };
}
