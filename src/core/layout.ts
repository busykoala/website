// Pure layout helpers for terminal rendering

export interface ClearedLayoutInput {
  viewportHeight: number;
  padTop: number;
  anchorTop: number;
  promptTop: number;
  promptHeight: number;
  lastChildTop?: number;
  lastChildHeight?: number;
}

export interface ClearedLayoutResult {
  spacerHeight: number;
  desiredScrollTop: number;
  exitCleared: boolean;
}

export function computeClearedLayout(input: ClearedLayoutInput): ClearedLayoutResult {
  const {
    viewportHeight,
    padTop,
    anchorTop,
    promptTop,
    promptHeight,
    lastChildTop,
    lastChildHeight,
  } = input;

  const promptBottom = promptTop + promptHeight;
  const lastBottom =
    lastChildTop != null && lastChildHeight != null ? lastChildTop + lastChildHeight : -Infinity;
  const contentBottom = Math.max(promptBottom, lastBottom);
  const newSessionHeight = Math.max(0, contentBottom - anchorTop);

  const spacerHeight = Math.max(0, viewportHeight - newSessionHeight);
  const desiredScrollTop =
    newSessionHeight < viewportHeight
      ? Math.max(0, anchorTop - padTop)
      : Math.max(0, contentBottom - viewportHeight);

  const exitCleared = newSessionHeight >= viewportHeight;

  return { spacerHeight, desiredScrollTop, exitCleared };
}
