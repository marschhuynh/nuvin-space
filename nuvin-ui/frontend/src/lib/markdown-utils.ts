/**
 * Utility functions for processing markdown content
 */

/**
 * Processes markdown text by unwrapping ```markdown ``` blocks and returning the processed content
 * @param text The input text to process
 * @returns The processed text with markdown blocks unwrapped
 */
export function unwrapMarkdownBlocks(text: string): string {
  const lines = text.split('\n');
  const result: string[] = [];
  const markdownStack: Array<{ backticks: number; level: number }> = [];
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

/**
 * Counts and extracts all code blocks from markdown text, including nested ones
 * Automatically unwraps markdown code blocks to return just their content
 * @param text The input text to process
 * @returns An object containing count and extracted code blocks
 */
export function countAndExtractCodeBlocks(text: string): {
  count: number;
  blocks: Array<{
    language: string;
    content: string;
    fullMatch: string;
    startLine: number;
    endLine: number;
    level: number;
    indentLevel: number;
    isUnwrapped: boolean; // Indicates if content was unwrapped from markdown block
  }>;
} {
  const lines = text.split('\n');
  const blocks: Array<{
    language: string;
    content: string;
    fullMatch: string;
    startLine: number;
    endLine: number;
    level: number;
    indentLevel: number;
    isUnwrapped: boolean;
  }> = [];
  const blockStack: Array<{
    language: string;
    content: string[];
    fullMatch: string[];
    startLine: number;
    endLine: number;
    backtickCount: number;
    indentLevel: number;
    level: number;
  }> = []; // Stack to track nested blocks

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Look for code block markers (including indented ones)
    const match = line.match(/^(\s*)(`{3,})(.*)$/);
    if (match) {
      const indent = match[1];
      const backticks = match[2];
      const language = match[3].trim();

      if (language !== '') {
        // Opening a new code block
        const newBlock = {
          language,
          content: [],
          fullMatch: [line],
          startLine: lineNum,
          endLine: -1,
          backtickCount: backticks.length,
          indentLevel: indent.length,
          level: blockStack.length // Track nesting level
        };
        blockStack.push(newBlock);
      } else {
        // Closing a code block (empty language)
        if (blockStack.length > 0) {
          const currentBlock = blockStack[blockStack.length - 1];

          // Check if this matches the expected closing backticks
          if (backticks.length === currentBlock.backtickCount) {
            // Close the current block
            currentBlock.endLine = lineNum;
            currentBlock.fullMatch.push(line);

            // Process the content based on language
            let processedContent = currentBlock.content.join('\n');
            let isUnwrapped = false;

            // If it's a markdown block, unwrap it and return just the content
            if (currentBlock.language.toLowerCase() === 'markdown') {
              processedContent = currentBlock.content.join('\n');
              isUnwrapped = true;
            }

            // Complete the block
            const completedBlock = {
              language: currentBlock.language,
              content: processedContent,
              fullMatch: currentBlock.fullMatch.join('\n'),
              startLine: currentBlock.startLine,
              endLine: currentBlock.endLine,
              level: currentBlock.level,
              indentLevel: currentBlock.indentLevel,
              isUnwrapped
            };

            blocks.push(completedBlock);
            blockStack.pop();

            // Add this line to parent block if it exists
            if (blockStack.length > 0) {
              blockStack[blockStack.length - 1].content.push(line);
              blockStack[blockStack.length - 1].fullMatch.push(line);
            }
          } else {
            // Doesn't match - treat as content
            currentBlock.content.push(line);
            currentBlock.fullMatch.push(line);
          }
        }
      }
    } else {
      // Regular line - add to all active blocks
      blockStack.forEach(block => {
        block.content.push(line);
        block.fullMatch.push(line);
      });
    }
  }

  // Handle any unclosed blocks
  blockStack.forEach(block => {
    block.endLine = lines.length;

    // Process the content based on language
    let processedContent = block.content.join('\n');
    let isUnwrapped = false;

    // If it's a markdown block, unwrap it and return just the content
    if (block.language.toLowerCase() === 'markdown') {
      processedContent = block.content.join('\n');
      isUnwrapped = true;
    }

    const completedBlock = {
      language: block.language,
      content: processedContent,
      fullMatch: block.fullMatch.join('\n'),
      startLine: block.startLine,
      endLine: block.endLine,
      level: block.level,
      indentLevel: block.indentLevel,
      isUnwrapped
    };
    blocks.push(completedBlock);
  });

  return {
    count: blocks.length,
    blocks
  };
}

/**
 * Finds and replaces markdown code blocks with their content
 * @param text The input text to process
 * @returns The processed text with markdown blocks replaced
 */
export function findAndReplaceMarkdownBlocks(text: string): string {
  let result = text;
  let hasChanges = true;
  let iterationCount = 0;
  const maxIterations = 20; // Safety limit to prevent infinite loops

  // Keep processing until no more markdown blocks are found
  while (hasChanges && iterationCount < maxIterations) {
    hasChanges = false;
    iterationCount++;

    // Process all markdown blocks in this iteration
    const originalResult = result;
    result = processAllMarkdownBlocksInText(result);

    // Check if any changes were made
    if (result !== originalResult) {
      hasChanges = true;
    }
  }

  return result;
}

function processAllMarkdownBlocksInText(text: string): string {
  const lines = text.split('\n');
  let inMarkdownBlock = false;
  let markdownStartLine = -1;
  let backtickCount = 0;
  let blockContent: string[] = [];
  const replacements: Array<{ fullMatch: string; content: string }> = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!inMarkdownBlock) {
      // Look for markdown block start (handle indented blocks too)
      const match = line.match(/^(\s*)(`{3,})\s*markdown\s*$/);
      if (match) {
        inMarkdownBlock = true;
        markdownStartLine = i;
        backtickCount = match[2].length;
        blockContent = [];
      }
    } else {
      // Look for matching closing backticks that have the exact same count
      const closeMatch = line.match(/^(\s*)(`{3,})\s*$/);
      if (closeMatch && closeMatch[2].length === backtickCount) {
        // Found the closing backticks
        const fullMatch = lines.slice(markdownStartLine, i + 1).join('\n');
        const content = blockContent.join('\n');

        replacements.push({
          fullMatch,
          content: content.trim()
        });

        inMarkdownBlock = false;
        blockContent = [];
      } else {
        // Add line to block content (including lines that might look like closing backticks but don't match)
        blockContent.push(line);
      }
    }
  }

  // Replace each block with its content (reverse order to avoid index issues)
  let result = text;
  for (const replacement of replacements.reverse()) {
    result = result.replace(replacement.fullMatch, replacement.content);
  }

  return result;
}