# Conversation Compression Algorithm

## Overview

The compression algorithm reduces conversation token count while preserving semantic meaning and essential context. It's designed to work with any conversation format, not just specific use cases.

## Activation

- **Standard**: `/summary` - Uses LLM-based summarization (existing behavior)
- **Beta**: `/summary beta` - Uses compression algorithm

## Compression Strategies

### 1. Stale File Reads (Remove)

**Rule**: If a file is read, then later edited or created, remove the earlier read.

**Rationale**: The file content changed, so the old read is obsolete.

**Example**:
```
1. file_read(specs/doc.md)     ← Remove this
2. ... some edits ...
3. file_edit(specs/doc.md)     ← Keep this
```

### 2. Stale File Edits (Keep Last Only)

**Rule**: For multiple edits to the same file, keep only the final edit.

**Rationale**: Intermediate edits are superseded by later changes.

**Example**:
```
1. file_edit(config.ts) - add feature A     ← Remove
2. file_edit(config.ts) - fix bug in A      ← Remove  
3. file_edit(config.ts) - refactor A        ← Keep (final state)
```

### 3. Stale Bash Commands (Remove)

**Rule**: If the same bash command is executed multiple times, keep only the last execution.

**Rationale**: Later outputs supersede earlier ones for the same command.

**Example**:
```
1. bash_tool("ls -la")        ← Remove this
2. ... some changes ...
3. bash_tool("ls -la")        ← Keep this (latest output)
```

### 4. Failed Bash Commands (Remove)

**Rule**: Remove bash commands that resulted in errors.

**Rationale**: Failed attempts don't contribute to final state.

**Error patterns detected**:
- `error:`
- `failed`
- `exception`
- `command not found`
- `permission denied`
- `no such file`
- `cannot`
- `fatal:`

## What's Preserved

✅ **Always kept**:
- All user messages (conversation intent)
- Final versions of file operations
- Successful tool executions
- New files created
- Conversation flow and structure

❌ **Can be removed**:
- Stale file reads
- Intermediate file edits
- Failed bash commands
- Assistant messages linked to removed tool calls

## Implementation Details

### Core Algorithm

```typescript
function compressConversation(messages: Message[]) {
  // 1. Analyze all file operations
  const { reads, edits, creates } = analyzeFileOperations(messages);
  
  // 2. Mark stale reads for removal
  for (const read of reads) {
    if (wasEditedLater(read, edits, creates)) {
      markForRemoval(read);
    }
  }
  
  // 3. Keep only final edits
  for (const edit of edits) {
    if (hasLaterEdit(edit, edits)) {
      markForRemoval(edit);
    }
  }
  
  // 4. Remove stale and failed bash commands
  const bashOps = analyzeBashOperations(messages);
  for (const bash of bashOps) {
    if (hasErrors(bash) || hasLaterSameCommand(bash, bashOps)) {
      markForRemoval(bash);
    }
  }
  
  // 5. Filter out marked messages
  return messages.filter(msg => !markedForRemoval(msg));
}
```

### Timestamp-Based Staleness

Operations are compared by timestamp to determine order:

```typescript
function isStaleFileRead(read, edits, creates) {
  const laterEdits = edits.filter(e => 
    e.path === read.path && 
    e.timestamp > read.timestamp
  );
  
  return laterEdits.length > 0;
}
```

## Results

### Example from Test Run

**Input**: 215 messages, 28,945 tokens

**Output**: 149 messages, 25,087 tokens

**Reduction**:
- Messages: 30.7% reduction (66 removed)
- Tokens: 13.3% reduction (3,858 saved)

**Breakdown**:
- Stale file reads: 6
- Stale file edits: 27
- Failed bash commands: 0

### Why Token Reduction < Message Reduction

High-token content (file reads, user messages) is preserved, while low-token items (assistant acknowledgments, intermediate edits) are removed.

## Usage in CLI

```bash
# Standard LLM summary (default)
/summary

# Compression algorithm (beta mode)
/summary beta
```

After running `/summary beta`, you'll see:
- 🧪 Compression mode indicator
- 📊 Reduction statistics (messages and percentage)
- 🗑️ Breakdown of what was removed (stale reads, edits, stale bash, failed bash)

Example output:
```
🧪 Using beta compression algorithm...
✓ Conversation compressed successfully
📊 Compression stats: 215 → 149 messages (-66, 30.7% reduction)
🗑️  Removed: 6 stale reads, 27 stale edits, 0 stale bash, 0 failed bash
```

## Future Enhancements

Potential additions:
- Compress tool result content (truncate large outputs)
- Deduplicate identical file reads
- Cluster sequential user corrections
- Remove empty assistant messages
- Semantic grouping of related operations
