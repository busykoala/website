import { describe, it, expect } from 'vitest';
import { computeClearedLayout } from '../core/layout';

// These tests validate the calculation used to position the prompt at the top
// after `clear` and to keep previous history hidden until enough new content
// fills the viewport, mimicking a Linux terminal.

describe('computeClearedLayout', () => {
  it('keeps prompt anchored at top with spacer hiding previous history', () => {
    const res = computeClearedLayout({
      viewportHeight: 400,
      padTop: 10,
      anchorTop: 100, // live region starts at 100
      promptTop: 100, // prompt at the start of live
      promptHeight: 20, // prompt is 20px tall
    });

    // New-session height is just the prompt for now (120 - 100 = 20)
    expect(res.spacerHeight).toBe(400 - 20);
    // Scroll so that the start of live (anchor) is at the top (minus padding)
    expect(res.desiredScrollTop).toBe(90);
    // Not enough content yet to exit cleared mode
    expect(res.exitCleared).toBe(false);
  });

  it('grows session height when output appears under prompt, still keeping history hidden', () => {
    const res = computeClearedLayout({
      viewportHeight: 400,
      padTop: 10,
      anchorTop: 100,
      promptTop: 100,
      promptHeight: 20, // prompt bottom = 120
      lastChildTop: 130, // first command/output starts below prompt
      lastChildHeight: 18, // last bottom = 148
    });

    // New-session height is from 100 (anchor) to 148 (content bottom)
    expect(res.spacerHeight).toBe(400 - (148 - 100)); // 400 - 48 = 352
    expect(res.desiredScrollTop).toBe(90);
    expect(res.exitCleared).toBe(false);
  });

  it('exits cleared mode once new content fills the viewport', () => {
    const res = computeClearedLayout({
      viewportHeight: 400,
      padTop: 10,
      anchorTop: 100,
      promptTop: 100,
      promptHeight: 20,
      // Enough output so bottom of new session reaches 500 => height 400
      lastChildTop: 480,
      lastChildHeight: 20,
    });

    expect(res.spacerHeight).toBe(0);
    // Now we follow the bottom so the prompt/input stays visible at the bottom
    expect(res.desiredScrollTop).toBe(100);
    expect(res.exitCleared).toBe(true);
  });
});
