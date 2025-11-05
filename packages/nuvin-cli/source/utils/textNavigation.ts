export type VimMode = 'insert' | 'normal';

export type LineInfo = {
  lines: string[];
  lineIndex: number;
  column: number;
  lineStart: number;
  lineEnd: number;
};

export function getLineInfo(value: string, offset: number): LineInfo {
  const lines = value.split('\n');

  let currentPos = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineEnd = currentPos + line.length;
    if (offset <= lineEnd) {
      return {
        lines,
        lineIndex: i,
        column: offset - currentPos,
        lineStart: currentPos,
        lineEnd,
      };
    }
    currentPos = lineEnd + 1;
  }

  const lastIndex = Math.max(0, lines.length - 1);
  const lastLine = lines[lastIndex] ?? '';
  const lineStart = value.length - lastLine.length;
  return {
    lines,
    lineIndex: lastIndex,
    column: lastLine.length,
    lineStart,
    lineEnd: value.length,
  };
}

export function moveCursorVertically(value: string, offset: number, direction: 'up' | 'down'): number | null {
  if (!value.includes('\n')) {
    return null;
  }

  const info = getLineInfo(value, offset);
  const targetIndex = direction === 'up' ? info.lineIndex - 1 : info.lineIndex + 1;

  if (targetIndex < 0 || targetIndex >= info.lines.length) {
    return null;
  }

  const targetLineLength = info.lines[targetIndex].length;
  const targetColumn = Math.min(info.column, targetLineLength);

  let newPos = 0;
  for (let i = 0; i < targetIndex; i++) {
    newPos += info.lines[i].length + 1;
  }

  return newPos + targetColumn;
}

export function findNextWordEnd(text: string, start: number): number {
  let i = start;

  while (i < text.length && /\s/.test(text[i])) {
    i++;
  }

  while (i < text.length && !/\s/.test(text[i])) {
    i++;
  }

  return Math.min(i, text.length);
}

export function clampOffset(valueLength: number, offset: number, mode: VimMode): number {
  if (valueLength <= 0) {
    return 0;
  }

  if (mode === 'normal') {
    const maxOffset = Math.max(0, valueLength - 1);
    return Math.max(0, Math.min(offset, maxOffset));
  }

  return Math.max(0, Math.min(offset, valueLength));
}
