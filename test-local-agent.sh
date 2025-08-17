#!/bin/bash

# LocalAgent Test Runner Script (Vitest)

echo "🧪 Running LocalAgent Unit Tests (Vitest)"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to run tests with different configurations
run_test() {
    local test_name="$1"
    local test_command="$2"

    echo -e "\n${BLUE}📋 Running: $test_name${NC}"
    echo "----------------------------------------"

    if eval "$test_command"; then
        echo -e "${GREEN}✅ $test_name - PASSED${NC}"
        return 0
    else
        echo -e "${RED}❌ $test_name - FAILED${NC}"
        return 1
    fi
}

# Change to frontend directory
cd nuvin-ui/frontend || {
    echo -e "${RED}❌ Could not find nuvin-ui/frontend directory${NC}"
    exit 1
}

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    npm install
fi

# Test configurations
FAILED_TESTS=0

# 1. Run basic LocalAgent tests
run_test "Basic LocalAgent Tests" \
    "npx vitest run src/lib/agents/__tests__/local-agent-refactored.test.ts" || ((FAILED_TESTS++))

# 2. Run recursive tool call tests
run_test "Recursive Tool Call Tests" \
    "npx vitest run src/lib/agents/__tests__/local-agent-recursive-tools.test.ts" || ((FAILED_TESTS++))

# 3. Run all agent tests together
run_test "All Agent Tests" \
    "npx vitest run src/lib/agents/__tests__/" || ((FAILED_TESTS++))

# 4. Run with coverage
run_test "Coverage Report" \
    "npx vitest run src/lib/agents/__tests__/ --coverage" || ((FAILED_TESTS++))

# 5. Run specific test scenarios
echo -e "\n${BLUE}🎯 Running Specific Test Scenarios${NC}"
echo "----------------------------------------"

# Test recursive tool calls specifically
run_test "Recursive Tool Call Scenarios" \
    "npx vitest run src/lib/agents/__tests__/ --reporter=verbose -t 'recursive|Recursive'" || ((FAILED_TESTS++))

# Test error handling
run_test "Error Handling Tests" \
    "npx vitest run src/lib/agents/__tests__/ --reporter=verbose -t 'error|Error'" || ((FAILED_TESTS++))

# Test message building
run_test "Message Building Tests" \
    "npx vitest run src/lib/agents/__tests__/ --reporter=verbose -t 'message|Message|history|History'" || ((FAILED_TESTS++))

# Summary
echo -e "\n${BLUE}📊 Test Summary${NC}"
echo "================================="

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed successfully!${NC}"
    echo -e "${GREEN}✅ LocalAgent refactoring is working correctly${NC}"
    echo -e "${GREEN}✅ Recursive tool calls are functioning properly${NC}"
    echo -e "${GREEN}✅ Error handling is robust${NC}"
    echo -e "${GREEN}✅ Message flow is correct${NC}"
else
    echo -e "${RED}❌ $FAILED_TESTS test suite(s) failed${NC}"
    echo -e "${YELLOW}🔍 Please review the test output above for details${NC}"
fi

# Generate detailed coverage report
echo -e "\n${BLUE}📈 Generating Detailed Coverage Report${NC}"
echo "----------------------------------------"
npx vitest run src/lib/agents/__tests__/ --coverage --reporter=html

if [ -f "coverage/index.html" ]; then
    echo -e "${GREEN}📊 Coverage report generated: coverage/index.html${NC}"
else
    echo -e "${YELLOW}⚠️  Coverage report not generated${NC}"
fi

# Test performance (optional)
echo -e "\n${BLUE}⚡ Performance Test (Optional)${NC}"
echo "----------------------------------------"
echo "Running performance test for recursive tool calls..."

npx vitest run src/lib/agents/__tests__/ \
    --reporter=verbose \
    -t "should handle file processing pipeline with 5 recursive steps"

# Exit with appropriate code
exit $FAILED_TESTS