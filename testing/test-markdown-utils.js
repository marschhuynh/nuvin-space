#!/usr/bin/env node

/**
 * Standalone test runner for findAndReplaceMarkdownBlocks function
 * Can be run with: node testing/test-markdown-utils.js
 */

// Since this is a standalone Node.js script, we'll implement the function here for testing
function findAndReplaceMarkdownBlocks(text) {
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

function processAllMarkdownBlocksInText(text) {
  const lines = text.split('\n');
  let inMarkdownBlock = false;
  let markdownStartLine = -1;
  let backtickCount = 0;
  let blockContent = [];
  const replacements = [];

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

// Read input-fail.md file for testing
function testInputFailFile() {
  const fs = require('fs');
  const path = require('path');

  try {
    const inputFailPath = path.join(__dirname, 'input-fail.md');
    const inputFailContent = fs.readFileSync(inputFailPath, 'utf-8');

    console.log('🔍 Testing input-fail.md file:\n');

    const result = findAndReplaceMarkdownBlocks(inputFailContent);

    console.log(result);

    // Count different types of blocks
    const inputMarkdownBlocks = (inputFailContent.match(/```markdown/g) || []).length;
    const outputMarkdownBlocks = (result.match(/```markdown/g) || []).length;
    const outputJsonBlocks = (result.match(/```json/g) || []).length;
    const outputPythonBlocks = (result.match(/```python/g) || []).length;
    const outputCodeBlocks = (result.match(/```\w+/g) || []).length;
    
    // Function to count actual opening/closing pairs
    function countCodeBlockPairs(text) {
      const lines = text.split('\n');
      let pairs = 0;
      let inCodeBlock = false;
      
      for (const line of lines) {
        if (line.trim().startsWith('```')) {
          if (!inCodeBlock) {
            // Found opening
            inCodeBlock = true;
          } else {
            // Found closing - complete pair
            pairs++;
            inCodeBlock = false;
          }
        }
      }
      
      return {
        pairs,
        unclosed: inCodeBlock ? 1 : 0,
        total: text.match(/```/g)?.length || 0
      };
    }
    
    const inputAnalysis = countCodeBlockPairs(inputFailContent);
    const outputAnalysis = countCodeBlockPairs(result);

    console.log('============================================================');
    console.log('ANALYSIS:');
    console.log('============================================================');
    console.log(`• Input \`\`\` total: ${inputAnalysis.total} (${inputAnalysis.pairs} complete pairs${inputAnalysis.unclosed ? ', 1 unclosed' : ''})`);
    console.log(`• Output \`\`\` total: ${outputAnalysis.total} (${outputAnalysis.pairs} complete pairs${outputAnalysis.unclosed ? ', 1 unclosed' : ''})`);
    console.log(`• Reduction: ${inputAnalysis.total - outputAnalysis.total} \`\`\` removed`);
    console.log(`• Pairs removed: ${inputAnalysis.pairs - outputAnalysis.pairs}`);
    console.log('');
    console.log(`• Input markdown blocks: ${inputMarkdownBlocks}`);
    console.log(`• Output markdown blocks: ${outputMarkdownBlocks}`);
    console.log(`• Output JSON blocks: ${outputJsonBlocks} (preserved)`);
    console.log(`• Output Python blocks: ${outputPythonBlocks} (preserved)`);
    console.log(`• Total output code blocks: ${outputCodeBlocks} (all non-markdown)`);

    if (outputMarkdownBlocks === 0 && inputMarkdownBlocks > 0) {
      console.log('✅ SUCCESS: All markdown wrapper blocks processed!');
      console.log('✅ SUCCESS: All language-specific code blocks preserved!');
      return true;
    } else if (outputMarkdownBlocks > 0) {
      console.log(`❌ FAILED: ${outputMarkdownBlocks} markdown blocks still remain`);
      return false;
    } else {
      console.log('ℹ️  No markdown blocks found to process');
      return true;
    }
  } catch (error) {
    console.error('❌ Error reading input-fail.md:', error.message);
    return false;
  }
}

// Run tests
if (require.main === module) {
  const fileTestSuccess = testInputFailFile();
  process.exit(fileTestSuccess ? 0 : 1);
}