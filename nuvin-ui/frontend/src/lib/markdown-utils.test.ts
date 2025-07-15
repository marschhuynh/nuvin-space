/**
 * Test script for findAndReplaceMarkdownBlocks function
 */

import { findAndReplaceMarkdownBlocks } from './markdown-utils';

// Test cases
const testCases = [
  {
    name: 'Simple markdown block',
    input: `Here is some text
\`\`\`markdown
# Hello World
This is **bold** text
\`\`\`
More text after`,
    expected: `Here is some text
# Hello World
This is **bold** text
More text after`
  },
  {
    name: 'Multiple markdown blocks',
    input: `\`\`\`markdown
# First Block
Content 1
\`\`\`

Some text in between

\`\`\`markdown
# Second Block
Content 2
\`\`\``,
    expected: `# First Block
Content 1

Some text in between

# Second Block
Content 2`
  },
  {
    name: 'Nested backticks with different counts',
    input: `\`\`\`\`markdown
# Title
\`\`\`javascript
console.log('code inside markdown');
\`\`\`
\`\`\`\``,
    expected: `# Title
\`\`\`javascript
console.log('code inside markdown');
\`\`\``
  },
  {
    name: 'No markdown blocks',
    input: `Just regular text
\`\`\`javascript
console.log('not markdown');
\`\`\`
More text`,
    expected: `Just regular text
\`\`\`javascript
console.log('not markdown');
\`\`\`
More text`
  },
  {
    name: 'Empty markdown block',
    input: `\`\`\`markdown
\`\`\``,
    expected: ``
  },
  {
    name: 'Markdown block with extra spaces',
    input: `\`\`\`markdown   
# Title with spaces
Content here
\`\`\``,
    expected: `# Title with spaces
Content here`
  }
];

// Test runner function
function runTests() {
  console.log('🧪 Running tests for findAndReplaceMarkdownBlocks...\n');
  
  let passed = 0;
  let failed = 0;

  testCases.forEach((testCase, index) => {
    console.log(`Test ${index + 1}: ${testCase.name}`);
    
    try {
      const result = findAndReplaceMarkdownBlocks(testCase.input);
      
      if (result === testCase.expected) {
        console.log('✅ PASSED\n');
        passed++;
      } else {
        console.log('❌ FAILED');
        console.log('Expected:', JSON.stringify(testCase.expected));
        console.log('Got:', JSON.stringify(result));
        console.log('');
        failed++;
      }
    } catch (error) {
      console.log('❌ ERROR:', error);
      console.log('');
      failed++;
    }
  });

  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    console.log('🎉 All tests passed!');
  } else {
    console.log('💥 Some tests failed. Please check the implementation.');
  }

  return failed === 0;
}

// Interactive test function for manual testing
export function testMarkdownBlocks(input: string): void {
  console.log('Input:');
  console.log(input);
  console.log('\nOutput:');
  console.log(findAndReplaceMarkdownBlocks(input));
  console.log('\n---\n');
}

// Run tests if this file is executed directly
if (typeof require !== 'undefined' && require.main === module) {
  runTests();
}

// Export for use in other test files
export { runTests };