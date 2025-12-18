import { useState, useEffect, useRef, useCallback } from 'react';
import chalk from 'chalk';

export type CursorRenderResult = {
  renderedValue: string;
  renderedPlaceholder?: string;
};

export function useCursorRenderer() {
  const [cursorVisible, setCursorVisible] = useState(true);
  const lastActivityRef = useRef<number>(Date.now());
  const lastValueRef = useRef<string>('');
  const lastOffsetRef = useRef<number>(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const timeSinceActivity = Date.now() - lastActivityRef.current;
      if (timeSinceActivity > 300) {
        setCursorVisible((prev) => !prev);
      }
    }, 530);

    return () => clearInterval(interval);
  }, []);

  const renderWithCursor = useCallback((
    value: string,
    cursorOffset: number,
    placeholder: string,
    showCursor: boolean,
    focus: boolean,
  ): CursorRenderResult => {
    if (value !== lastValueRef.current || cursorOffset !== lastOffsetRef.current) {
      lastActivityRef.current = Date.now();
      lastValueRef.current = value;
      lastOffsetRef.current = cursorOffset;
      if (!cursorVisible) {
        setCursorVisible(true);
      }
    }
    let renderedValue = value;
    let renderedPlaceholder = placeholder ? chalk.grey(placeholder) : undefined;

    if (!showCursor || !focus) {
      return { renderedValue, renderedPlaceholder };
    }

    const shouldShowCursor = cursorVisible;

    renderedPlaceholder =
      placeholder.length > 0
        ? (shouldShowCursor ? chalk.inverse(placeholder[0]) : chalk.grey(placeholder[0])) + chalk.grey(placeholder.slice(1))
        : shouldShowCursor
          ? chalk.inverse(' ')
          : ' ';

    if (value.length === 0) {
      renderedValue = shouldShowCursor ? chalk.inverse(' ') : ' ';
      return { renderedValue, renderedPlaceholder };
    }

    const lines = value.split('\n');
    let currentPos = 0;
    let currentLine = 0;
    let columnInLine = 0;

    for (let i = 0; i < lines.length; i++) {
      const lineEnd = currentPos + lines[i].length;
      if (cursorOffset <= lineEnd) {
        currentLine = i;
        columnInLine = cursorOffset - currentPos;
        break;
      }
      currentPos = lineEnd + 1;
    }

    renderedValue = lines
      .map((line, idx) => {
        if (idx === currentLine) {
          if (columnInLine >= 0 && columnInLine < line.length) {
            const cursorChar = shouldShowCursor ? chalk.inverse(line[columnInLine]) : line[columnInLine];
            return line.slice(0, columnInLine) + cursorChar + line.slice(columnInLine + 1);
          } else {
            return line + (shouldShowCursor ? chalk.inverse(' ') : '');
          }
        }
        return line;
      })
      .join('\n');

    return { renderedValue, renderedPlaceholder };
  }, [cursorVisible]);

  return { renderWithCursor };
}
