import { CommandContext } from '../core/TerminalCore';
import { IOStreams } from '../core/streams';
import { parseFlags } from '../utils/flagParser';
import { ExitCode, writeError } from '../utils/errorMessages';

function createOverlay(): HTMLDivElement {
  const overlay = document.createElement('div');
  overlay.className = 'cmatrix-overlay';
  overlay.style.position = 'fixed';
  overlay.style.inset = '0';
  overlay.style.zIndex = '99999';
  overlay.style.background = 'rgba(0, 0, 0, 0)'; // transparent background
  overlay.style.color = '#00ff00';
  overlay.style.pointerEvents = 'auto'; // block interactions underneath
  overlay.setAttribute('aria-hidden', 'true');
  return overlay;
}

export async function cmatrixAsync(
  args: string[],
  context: CommandContext,
  io: IOStreams,
): Promise<number> {
  try {
    // Help/version
    if (args.includes('--help') || args.includes('-h')) {
      io.stdout.write(cmatrixAsyncCommand.usage || cmatrixAsyncCommand.description || 'cmatrix');
      return ExitCode.SUCCESS;
    }
    if (args.includes('--version')) {
      io.stdout.write('cmatrix (GNU coreutils simulation) 1.0.0\n');
      return ExitCode.SUCCESS;
    }

    const parsed = parseFlags(args, [
      { short: 'a', long: 'async' },
      { short: 'b', long: 'bold-some' },
      { short: 'B', long: 'bold-all' },
      { short: 'f', long: 'force' },
      { short: 's', long: 'screensaver' },
      { short: 'r', long: 'rainbow' },
      { short: 'u', long: 'delay', takesValue: true, type: 'number' },
      { short: 'C', long: 'color', takesValue: true, type: 'string' },
    ]);

    const flagAsync = parsed.flags.has('async');
    const flagBoldSome = parsed.flags.has('bold-some');
    const flagBoldAll = parsed.flags.has('bold-all');
    const flagForce = parsed.flags.has('force');
    const flagScreensaver = parsed.flags.has('screensaver');
    const flagRainbow = parsed.flags.has('rainbow');
    const delayMicros = (parsed.flags.get('delay') as number | undefined) ?? null;
    const colorName = (parsed.flags.get('color') as string | undefined) ?? null;

    // If not in a browser DOM (e.g., server), fallback to simple output
    if (typeof document === 'undefined') {
      io.stdout.write('<pre>CMATRIX</pre>');
      return ExitCode.SUCCESS;
    }

    const overlay = createOverlay();
    if (flagAsync) overlay.classList.add('cmatrix-async');
    if (flagBoldSome) overlay.classList.add('cmatrix-bold');
    if (flagBoldAll) overlay.classList.add('cmatrix-allbold');
    if (flagForce) overlay.classList.add('cmatrix-force');
    if (flagScreensaver) overlay.classList.add('cmatrix-screensaver');
    if (flagRainbow) overlay.classList.add('cmatrix-rainbow');
    if (delayMicros != null) overlay.dataset.delay = String(delayMicros);
    if (colorName && !flagRainbow) overlay.style.color = colorName;
    document.body.appendChild(overlay);

    // Disable typing while overlay active
    const inputEl = document.getElementById('terminal-input') as HTMLInputElement | null;
    const prevDisabled = inputEl?.disabled ?? false;
    if (inputEl) {
      inputEl.disabled = true;
      inputEl.blur();
    }

    // Ctrl+C to quit
    let stopped = false;
    const stop = () => {
      if (!stopped) {
        stopped = true;
      }
    };
    const ctrlCHandler = (e: KeyboardEvent) => {
      if (e.ctrlKey && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        stop();
      }
    };
    document.addEventListener('keydown', ctrlCHandler, { capture: true });

    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.top = '0';
    container.style.left = '0';
    container.style.right = '0';
    container.style.bottom = '0';
    container.style.overflow = 'hidden';
    container.style.display = 'flex';
    container.style.alignItems = 'stretch';
    container.style.justifyContent = 'stretch';

    const pre = document.createElement('pre');
    pre.style.margin = '0';
    pre.style.width = '100%';
    pre.style.height = '100%';
    pre.style.fontFamily =
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
    pre.style.fontSize = '14px';
    pre.style.lineHeight = '14px';
    pre.style.whiteSpace = 'pre';
    pre.style.userSelect = 'none';
    if (flagBoldAll) pre.style.fontWeight = 'bold';

    container.appendChild(pre);
    overlay.appendChild(container);

    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 800;
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 600;
    const lineHeight = 14; // as set above
    const rows = Math.max(5, Math.floor(viewportHeight / lineHeight));
    const cols = Math.max(10, Math.floor(viewportWidth / 9)); // approx char width

    // Helper to create a string of spaces without using padEnd
    const makeSpaces = (n: number) => {
      let s = '';
      for (let i = 0; i < n; i++) s += ' ';
      return s;
    };

    // Initialize columns
    const rng = (min: number, max: number) => Math.random() * (max - min) + min;
    type Col = { y: number; speed: number; glyph: string };
    // Expanded glyph set for variety
    const glyphsSet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz@#$%&*+=-';
    const columns: Col[] = [];
    for (let c = 0; c < cols; c++) {
      const speed = flagAsync ? rng(0.4, 1.2) : 0.8; // rows per frame factor
      const y = Math.floor(Math.random() * rows);
      const g = glyphsSet[Math.floor(Math.random() * glyphsSet.length)];
      columns.push({ y, speed, glyph: g });
    }

    const frameIntervalMs =
      delayMicros != null ? Math.max(10, Math.floor((Number(delayMicros) || 0) / 1000)) : 50;
    const start = typeof performance !== 'undefined' ? performance.now() : Date.now();

    if (flagScreensaver) {
      const endOnEvent = () => stop();
      overlay.addEventListener('keydown', endOnEvent, { capture: true });
      overlay.addEventListener('click', endOnEvent, { capture: true });
      overlay.addEventListener('mousemove', endOnEvent, { capture: true });
    }

    const usePartialBold = flagBoldSome && !flagBoldAll;
    const headHighlightColor = flagForce ? '#ccffcc' : undefined;
    const needHtml = usePartialBold || !!headHighlightColor || flagRainbow;

    // Render loop
    await new Promise<void>((resolve) => {
      let lastTick = start;
      const tick = () => {
        if (stopped) {
          resolve();
          return;
        }
        const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
        // no auto-stop based on duration; only stop on Ctrl+C (or screensaver input)
        if (now - lastTick >= frameIntervalMs) {
          lastTick = now;
          // advance columns
          const buffer: string[] = [];
          for (let r = 0; r < rows; r++) buffer.push(makeSpaces(cols));
          const headRows: number[] = new Array(cols);
          for (let i = 0; i < cols; i++) headRows[i] = -1;
          // occasionally randomize glyphs
          for (let c = 0; c < cols; c++) {
            const col = columns[c];
            col.y = (col.y + col.speed) % rows;
            if (Math.random() < 0.2)
              col.glyph = glyphsSet[Math.floor(Math.random() * glyphsSet.length)];
            const headRow = Math.floor(col.y);
            headRows[c] = headRow;
            // draw a short trail above head using column glyph
            for (let t = 0; t < 5; t++) {
              const rr = (headRow - t + rows) % rows;
              const line = buffer[rr];
              const chars = line.split('');
              chars[c] = col.glyph;
              buffer[rr] = chars.join('');
            }
          }
          if (needHtml) {
            // Build HTML with spans for heads; apply rainbow or forced head color
            const lines: string[] = [];
            for (let r = 0; r < rows; r++) {
              let lineHtml = '';
              const line = buffer[r];
              for (let c = 0; c < cols; c++) {
                const ch = line[c] ?? ' ';
                if (ch !== ' ' && headRows[c] === r) {
                  const style: string[] = [];
                  if (usePartialBold) style.push('font-weight:bold');
                  if (flagRainbow) {
                    const hue = Math.floor((c / cols) * 360);
                    style.push(`color:hsl(${hue} 100% 70%)`);
                  } else if (headHighlightColor) {
                    style.push(`color:${headHighlightColor}`);
                  }
                  lineHtml += `<span style="${style.join(';')}">${ch}</span>`;
                } else {
                  lineHtml += ch;
                }
              }
              lines.push(lineHtml);
            }
            pre.innerHTML = lines.join('\n');
          } else {
            // Plain text, color via overlay.style.color or bold via pre style
            pre.innerText = buffer.join('\n');
          }
        }
        // schedule next frame
        typeof window !== 'undefined' &&
        'requestAnimationFrame' in window &&
        typeof requestAnimationFrame === 'function'
          ? requestAnimationFrame(tick)
          : setTimeout(tick, Math.max(16, frameIntervalMs));
      };

      typeof window !== 'undefined' &&
      'requestAnimationFrame' in window &&
      typeof requestAnimationFrame === 'function'
        ? requestAnimationFrame(tick)
        : setTimeout(tick, 0);
    });

    // Cleanup
    document.removeEventListener('keydown', ctrlCHandler, {
      capture: true,
    } as any);
    overlay.parentNode === document.body && overlay.remove();
    const inputEl2 = document.getElementById('terminal-input') as HTMLInputElement | null;
    if (inputEl2) {
      inputEl2.disabled = prevDisabled;
      if (!inputEl2.disabled) inputEl2.focus();
    }
    return ExitCode.SUCCESS;
  } catch (error) {
    return writeError(
      io.stderr,
      `cmatrix: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ExitCode.GENERAL_ERROR,
    );
  }
}

export const cmatrixAsyncCommand = {
  description: 'Simulates the digital rain from "The Matrix"',
  usage: 'cmatrix [-a] [-b] [-B] [-f] [-s] [-u DELAY_MICROS] [-r] [-C COLOR] [--help] ',
  execute: cmatrixAsync,
};
