import chalk from 'chalk';

export type CursorRenderResult = {
  renderedValue: string;
  renderedPlaceholder?: string;
};

export function useCursorRenderer() {
  const renderWithCursor = (
    value: string,
    cursorOffset: number,
    placeholder: string,
    showCursor: boolean,
    focus: boolean,
  ): CursorRenderResult => {
    let renderedValue = value;
    let renderedPlaceholder = placeholder ? chalk.grey(placeholder) : undefined;

    if (!showCursor || !focus) {
      return { renderedValue, renderedPlaceholder };
    }

    renderedPlaceholder =
      placeholder.length > 0 ? chalk.inverse(placeholder[0]) + chalk.grey(placeholder.slice(1)) : chalk.inverse(' ');

    if (value.length === 0) {
      renderedValue = chalk.inverse(' ');
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
            return line.slice(0, columnInLine) + chalk.inverse(line[columnInLine]) + line.slice(columnInLine + 1);
          } else {
            return line + chalk.inverse(' ');
          }
        }
        return line;
      })
      .join('\n');

    return { renderedValue, renderedPlaceholder };
  };

  return { renderWithCursor };
}
