export function unwrapMarkdownBlocks(text: string) {
  const lines = text.split('\n');
  const result = [];
  const markdownStack = [];
  let nestedLevel = 0; // Track nested non-markdown blocks

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for code block markers (including indented ones)
    const match = line.match(/^(\s*)(`{3,})(.*)$/);
    if (match) {
      const backticks = match[2];
      const language = match[3].trim();

      if (language !== '') {
        // Opening a code block
        if (language.toLowerCase() === 'markdown') {
          // Start markdown block - add to stack
          markdownStack.push({ backticks: backticks.length, level: nestedLevel });
          // Don't add the opening line
        } else {
          // Other code block - keep as is
          nestedLevel++;
          result.push(line);
        }
      } else {
        // Closing code block
        if (markdownStack.length > 0 &&
            backticks.length === markdownStack[markdownStack.length - 1].backticks &&
            nestedLevel === markdownStack[markdownStack.length - 1].level) {
          // Close markdown block
          markdownStack.pop();
          // Don't add the closing line
        } else {
          // Regular closing or nested block closing
          if (nestedLevel > 0) {
            nestedLevel--;
          }
          result.push(line);
        }
      }
    } else {
      // Regular line
      result.push(line);
    }
  }

  return result.join('\n');
}