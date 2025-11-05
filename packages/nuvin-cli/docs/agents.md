# Specialist Agents Guide

Nuvin CLI features a powerful multi-agent system for delegating complex tasks to specialized AI agents. Each agent is optimized for specific workflows and can work independently or collaboratively.

## Using Specialist Agents

You can interact with specialist agents in three ways:

### 1. Direct Delegation (Natural Language)

Simply mention the task in natural language:

```
"Delegate code review to the specialist agent"
"Have the quality tester create tests for this module"
"Ask the architect to design this feature"
```

### 2. Using the `/agent` Command

Use the interactive agent management interface:

```bash
/agent                    # Opens agent selection menu
```

### 3. Using the `assign_task` Tool

The main agent can automatically delegate tasks to specialists:

```
"I need a comprehensive code review of my recent changes"
# → Automatically delegates to code-reviewer agent

"Create tests for all functions in this file"
# → Automatically delegates to quality-tester agent
```

## Available Specialist Agents

### code-reviewer

Reviews code for bugs, style issues, and architectural concerns.

**Use cases:**
- Code review of recent changes
- Pull request reviews
- Quality assurance checks

**Example:**
```
"Review my recent code changes and suggest improvements"
```

### commit-specialist

Organizes uncommitted changes into logical, conventional commits.

**Use cases:**
- Organizing git changes
- Creating conventional commits
- Maintaining clean git history

**Example:**
```
"Organize my changes into conventional commits"
```

### conversation-compactor

Reduces token usage in conversation history while preserving meaning.

**Use cases:**
- Compressing long conversations
- Reducing context size
- Optimizing token usage

**Example:**
```
"Compress our conversation history to reduce tokens"
```

### document-researcher

Researches documentation for libraries, APIs, and frameworks.

**Use cases:**
- Learning new technologies
- API documentation research
- Best practices research

**Example:**
```
"Research React hooks documentation and create examples"
```

### quality-tester

Creates and analyzes tests, identifies coverage gaps.

**Use cases:**
- Generating unit tests
- Integration testing
- Test coverage analysis

**Example:**
```
"Create comprehensive tests for this module"
```

### solution-architect

Designs architecture with emphasis on patterns and maintainability.

**Use cases:**
- Feature architecture design
- Code refactoring
- Design pattern application
- Performance optimization

**Example:**
```
"Design a scalable architecture for this feature"
```

## Multi-Agent Architecture

### Agent Collaboration

Agents can work together in complex workflows:

- **Code-reviewer** identifies issues → **Solution-architect** suggests fixes
- **Document-researcher** gathers info → **Solution-architect** designs implementation
- **Quality-tester** creates tests → **Code-reviewer** validates test quality

### Delegation Flow

```
User Request → Main Agent → Task Analysis
                                ↓
                ┌───────────────┴───────────────┐
                ↓                               ↓
          Direct Response              Delegate to Specialist
                ↓                               ↓
          Response to User           Specialist Agent Execution
                                                ↓
                                     Results → Main Agent → User
```

### System Components

1. **Main Agent (Orchestrator)**
   - Handles user interactions
   - Routes tasks to appropriate specialist agents
   - Coordinates multi-agent workflows
   - Manages conversation context

2. **Specialist Agents**
   - Independent AI agents with specialized prompts
   - Each agent has domain-specific tools and knowledge
   - Can be invoked directly or automatically by main agent
   - Support for nested delegation (agents can delegate to other agents)

3. **Agent Registry**
   - Centralized registry of all available agents
   - Dynamic agent loading and initialization
   - Configuration-based agent enabling/disabling

## Examples

### Code Review Workflow

```
User: "Review my recent code changes"
→ Main Agent delegates to code-reviewer
→ Code-reviewer analyzes changes
→ Returns detailed review with suggestions
→ Main Agent presents results to user
```

### Testing Workflow

```
User: "Create tests for all my functions"
→ Main Agent delegates to quality-tester
→ Quality-tester analyzes code
→ Generates comprehensive test suite
→ Main Agent presents tests to user
```

### Architecture Design Workflow

```
User: "Design a new authentication system"
→ Main Agent delegates to solution-architect
→ Architect designs solution
→ Returns architecture diagram and implementation plan
→ Main Agent presents design to user
```
