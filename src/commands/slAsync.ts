// Displays a full-page overlay with an animated steam locomotive.

import { CommandContext } from '../core/TerminalCore';
import { IOStreams } from '../core/streams';
import { parseFlags } from '../utils/flagParser';
import { ExitCode } from '../utils/errorMessages';

function createOverlay(): HTMLDivElement {
  const overlay = document.createElement('div');
  overlay.className = 'sl-overlay';
  overlay.style.position = 'fixed';
  overlay.style.inset = '0';
  overlay.style.zIndex = '99999';
  overlay.style.background = 'rgba(0,0,0,0)'; // transparent
  overlay.style.pointerEvents = 'auto'; // block interactions underneath
  overlay.setAttribute('aria-hidden', 'true');
  return overlay;
}

// Original GNU sl ASCII assets adapted from sl.h
const D51_STR = [
  '      ====        ________                ___________ ',
  '  _D _|  |_______/        \\__I_I_____===__|_________| ',
  '   |(_)---  |   H\\________/ |   |        =|___ ___|   ',
  '   /     |  |   H  |  |     |   |         ||_| |_||   ',
  '  |      |  |   H  |__--------------------| [___] |   ',
  '  | ________|___H__/__|_____/[][]~\\_______|       |   ',
  '  |/ |   |-----------I_____I [][] []  D   |=======|__ ',
];
const D51_WHL = [
  [
    '__/ =| o |=-~~\\  /~~\\  /~~\\  /~~\\ ____Y___________|__ ',
    ' |/-=|___|=    ||    ||    ||    |_____/~\\___/        ',
    '  \\_/      \\O=====O=====O=====O_/      \\_/            ',
  ],
  [
    '__/ =| o |=-~~\\  /~~\\  /~~\\  /~~\\ ____Y___________|__ ',
    ' |/-=|___|=O=====O=====O=====O   |_____/~\\___/        ',
    '  \\_/      \\__/  \\__/  \\__/  \\__/      \\_/            ',
  ],
  [
    '__/ =| o |=-O=====O=====O=====O \\ ____Y___________|__ ',
    ' |/-=|___|=    ||    ||    ||    |_____/~\\___/        ',
    '  \\_/      \\__/  \\__/  \\__/  \\__/      \\_/            ',
  ],
  [
    '__/ =| o |=-~O=====O=====O=====O\\ ____Y___________|__ ',
    ' |/-=|___|=    ||    ||    ||    |_____/~\\___/        ',
    '  \\_/      \\__/  \\__/  \\__/  \\__/      \\_/            ',
  ],
  [
    '__/ =| o |=-~~\\  /~~\\  /~~\\  /~~\\ ____Y___________|__ ',
    ' |/-=|___|=   O=====O=====O=====O|_____/~\\___/        ',
    '  \\_/      \\__/  \\__/  \\__/  \\__/      \\_/            ',
  ],
  [
    '__/ =| o |=-~~\\  /~~\\  /~~\\  /~~\\ ____Y___________|__ ',
    ' |/-=|___|=    ||    ||    ||    |_____/~\\___/        ',
    '  \\_/      \\_O=====O=====O=====O/      \\_/            ',
  ],
];
const D51_DEL = '                                                      ';
const COAL = [
  '                              ',
  '                              ',
  '    _________________         ',
  '   _|                \\_____A  ',
  ' =|                        |  ',
  ' -|                        |  ',
  '__|________________________|_ ',
  '|__________________________|_ ',
  '   |_D__D__D_|  |_D__D__D_|   ',
  '    \\_/   \\_/    \\_/   \\_/    ',
  '                              ',
];

const LOGO_BASE = [
  '     ++      +------ ',
  '     ||      |+-+ |  ',
  '   /---------|| | |  ',
  '  + ========  +-+ |  ',
];
const LWHL = [
  [' _|--O========O~\\-+  ', '//// \\_/      \\_/    '],
  [' _|--/O========O\\-+  ', '//// \\_/      \\_/    '],
  [' _|--/~O========O-+  ', '//// \\_/      \\_/    '],
  [' _|--/~\\------/~\\-+  ', '//// \\_O========O    '],
  [' _|--/~\\------/~\\-+  ', '//// \\O========O/    '],
  [' _|--/~\\------/~\\-+  ', '//// O========O_/    '],
];
const LCOAL = [
  '____                 ',
  '|   \\@@@@@@@@@@@     ',
  '|    \\@@@@@@@@@@@@@_ ',
  '|                  | ',
  '|__________________| ',
  '   (O)       (O)     ',
  '                     ',
];
const LCAR = [
  '____________________ ',
  '|  ___ ___ ___ ___ | ',
  '|  |_| |_| |_| |_| | ',
  '|__________________| ',
  '|__________________| ',
  '   (O)        (O)    ',
  '                     ',
];

function composeWithOffsets(
  base: string[],
  parts: Array<{ x: number; lines: string[] }>,
): string[] {
  const height = Math.max(base.length, ...parts.map((p) => p.lines.length));
  const out: string[] = [];
  for (let i = 0; i < height; i++) {
    let row = base[i] ?? '';
    for (const p of parts) {
      const pad = p.x - row.length;
      if (pad > 0) row += ' '.repeat(pad);
      row += p.lines[i] ?? '';
    }
    out.push(row);
  }
  return out;
}

function locomotiveArtFrame(little = false, frame = 0): string {
  // Build frames using original assets (D51 or LOGO)
  if (little) {
    const idx = frame % LWHL.length;
    const base = [...LOGO_BASE, ...LWHL[idx], '                     ']; // DELLN
    const coal = [...LCOAL];
    const car = [...LCAR];
    const composed = composeWithOffsets(base, [
      { x: 21, lines: coal },
      { x: 42, lines: car },
      { x: 63, lines: car },
    ]);
    return composed.join('\n');
  }
  // D51 default
  const idx = frame % D51_WHL.length;
  const base = [...D51_STR, ...D51_WHL[idx], D51_DEL];
  const coal = [...COAL];
  const composed = composeWithOffsets(base, [{ x: 53, lines: coal }]);
  return composed.join('\n');
}

function renderPre(content: string): HTMLPreElement {
  const pre = document.createElement('pre');
  pre.style.margin = '0';
  pre.style.fontFamily =
    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
  pre.style.fontSize = '14px';
  pre.style.lineHeight = '14px';
  pre.style.whiteSpace = 'pre';
  pre.style.userSelect = 'none';
  pre.innerText = content;
  return pre;
}

export async function slAsync(
  args: string[],
  context: CommandContext,
  io: IOStreams,
): Promise<number> {
  // Flags and help/version
  if (args.includes('--help') || args.includes('-h')) {
    io.stdout.write(slAsyncCommand.usage || slAsyncCommand.description || 'sl');
    return ExitCode.SUCCESS;
  }
  if (args.includes('--version')) {
    io.stdout.write('sl (GNU coreutils simulation) 1.0.0\n');
    return ExitCode.SUCCESS;
  }

  const parsed = parseFlags(args);
  const flagAccident = parsed.raw.has('a');
  const flagLittle = parsed.raw.has('l');
  const flagFly = parsed.raw.has('F');

  // If not in a browser DOM (e.g., server), fallback to simple output
  if (typeof document === 'undefined') {
    io.stdout.write('<pre>SL</pre>');
    return ExitCode.SUCCESS;
  }

  const overlay = createOverlay();
  if (flagLittle) overlay.classList.add('sl-little');
  if (flagFly) overlay.classList.add('sl-fly');
  if (flagAccident) overlay.classList.add('sl-accident');
  document.body.appendChild(overlay);

  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.top = flagFly ? '20%' : '60%';
  container.style.left = '100%';
  container.style.transform = flagLittle ? 'scale(0.8)' : 'scale(1)';
  container.style.willChange = 'transform, left, top';
  container.style.pointerEvents = 'none'; // the train itself shouldn't capture

  const smoke = document.createElement('div');
  smoke.style.position = 'absolute';
  smoke.style.top = '-20px';
  smoke.style.left = '0';
  smoke.style.fontFamily = 'monospace';
  smoke.style.opacity = '0.6';
  smoke.textContent = flagFly ? '' : '~~~~~';

  const pre = renderPre(locomotiveArtFrame(flagLittle, 0));
  container.appendChild(pre);
  container.appendChild(smoke);
  overlay.appendChild(container);

  // Create smoke layer after container so tests still pick container as first div
  const smokeLayer = document.createElement('div');
  smokeLayer.style.position = 'absolute';
  smokeLayer.style.inset = '0';
  smokeLayer.style.pointerEvents = 'none';
  overlay.appendChild(smokeLayer);

  // Measure train width
  const trainWidth = container.getBoundingClientRect().width || 200;
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 800;
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 600;

  // Disable typing while overlay active
  const inputEl = document.getElementById('terminal-input') as HTMLInputElement | null;
  const prevDisabled = inputEl?.disabled ?? false;
  if (inputEl) {
    inputEl.disabled = true;
    inputEl.blur();
  }

  // Animation loop (short in jsdom tests, ~5s in browser)
  const isJsdom = typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent || '');
  const totalDuration = isJsdom ? 120 : 5000;
  const start = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const startLeft = viewportWidth;
  const endLeft = -trainWidth - 20;

  // Accident effect: slight shake
  let shakeSeed = 0;

  await new Promise<void>((resolve) => {
    const particles: Array<{
      el: HTMLElement;
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      kind: number;
    }> = [];
    const smokeGlyphs = [
      ['(   )', '(    )', '(   )', '(  )', '( )', '()', 'O', ' '],
      ['(@@@)', '(@@@@)', '(@@@)', '(@@)', '(@)', '@@', '@', ' '],
    ];
    let frame = 0;

    const step = (nowRaw: number) => {
      const now = nowRaw || (typeof performance !== 'undefined' ? performance.now() : Date.now());
      const t = Math.min(1, (now - start) / totalDuration);
      const left = startLeft + (endLeft - startLeft) * t;
      let yOffset = 0;
      if (flagAccident) {
        shakeSeed += 1;
        yOffset += Math.sin(shakeSeed / 2) * 2;
      }
      if (flagFly) {
        // Diagonal upward drift similar to original sl (y depends on x), but via translateY
        const startDiag = 0.1 * viewportHeight; // start lower
        const endDiag = flagLittle ? -0.25 * viewportHeight : -0.35 * viewportHeight; // end higher
        const diag = startDiag + (endDiag - startDiag) * t;
        // Layered sinusoidal wobble for a lively flight
        const wobble = Math.sin((now - start) / 180) * 8 + Math.sin((now - start) / 90 + 1.3) * 5;
        yOffset += diag + wobble;
      }
      container.style.left = `${left}px`;
      container.style.transform = `${flagLittle ? 'scale(0.8)' : 'scale(1)'} translateY(${yOffset}px)`;

      // Update engine art frame
      frame++;
      pre.innerText = locomotiveArtFrame(flagLittle, frame);

      // simple puff text in-engine (kept for compatibility)
      if (!flagFly) {
        const puffPhase = Math.floor((now - start) / 80) % 3;
        smoke.textContent = ['~~~', ' ~~~', '  ~~~'][puffPhase];
      }

      // spawn smoke particles behind funnel
      if (!flagFly && frame % 3 === 0) {
        const topPercent = parseFloat(container.style.top) || 60; // '60%'
        const baseY = (topPercent / 100) * viewportHeight + yOffset;
        // rough funnel offset
        const fx = left + (flagLittle ? 18 : 40);
        const fy = baseY - (flagLittle ? 20 : 30);
        const el = document.createElement('div');
        el.style.position = 'absolute';
        el.style.left = `${fx}px`;
        el.style.top = `${fy}px`;
        el.style.fontFamily = 'monospace';
        el.style.whiteSpace = 'pre';
        el.style.opacity = '0.9';
        el.textContent = smokeGlyphs[particles.length % 2][0];
        smokeLayer.appendChild(el);
        particles.push({
          el,
          x: fx,
          y: fy,
          vx: 0.8 + Math.random() * 1.2,
          vy: -0.8 - Math.random() * 0.6,
          life: 0,
          kind: particles.length % 2,
        });
      }

      // update particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life += 1;
        p.x += p.vx;
        p.y += p.vy;
        const idx = Math.min(smokeGlyphs[0].length - 1, Math.floor(p.life / 2));
        p.el.textContent = smokeGlyphs[p.kind][idx];
        p.el.style.left = `${p.x}px`;
        p.el.style.top = `${p.y}px`;
        const alpha = Math.max(0, 1 - p.life / 14);
        p.el.style.opacity = `${alpha}`;
        if (alpha <= 0 || p.y < -20 || p.x > viewportWidth + 50) {
          p.el.remove();
          particles.splice(i, 1);
        }
      }

      if (t < 1) {
        typeof window !== 'undefined' &&
        'requestAnimationFrame' in window &&
        typeof requestAnimationFrame === 'function'
          ? requestAnimationFrame(step)
          : setTimeout(
              () => step(typeof performance !== 'undefined' ? performance.now() : Date.now()),
              16,
            );
      } else {
        resolve();
      }
    };
    typeof window !== 'undefined' &&
    'requestAnimationFrame' in window &&
    typeof requestAnimationFrame === 'function'
      ? requestAnimationFrame(step)
      : setTimeout(
          () => step(typeof performance !== 'undefined' ? performance.now() : Date.now()),
          0,
        );
  });

  // Cleanup
  overlay.remove();
  if (inputEl) {
    inputEl.disabled = prevDisabled;
    if (!inputEl.disabled) inputEl.focus();
  }
  return ExitCode.SUCCESS;
}

export const slAsyncCommand = {
  description: 'Steam Locomotive - displays a train',
  usage: 'sl [-a] [-l] [-F] [--help]',
  execute: slAsync,
};
