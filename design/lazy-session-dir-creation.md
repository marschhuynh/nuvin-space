# Lazy Session Directory Creation Plan

## Problem

Currently, every time a user opens the CLI app with `memPersist: true`, a new empty session directory is created **immediately during initialization** - even if the user never sends a message. This leads to many empty/redundant session directories.

## Current Behavior

Session directories are created eagerly in these locations:

### 1. `OrchestratorManager.init()` (line 264-266)
```typescript
// Only create session directories if memPersist is enabled
if (this.memPersist) {
  this.createSessionDirectories(sessionDir);
}
```
**Problem**: Creates directory at app startup, before any user interaction.

### 2. `OrchestratorManager.createNewConversation()` (line 916-918)
```typescript
if (memPersist) {
  this.createSessionDirectories(sessionDir);
}
```
**Problem**: Creates directory when `/new` command is run, before any messages.

### 3. `useSessionManagement.createNewSession()` (line 169-172)
```typescript
const sessionDir = path.join(dir, id);
try {
  await fsp.mkdir(sessionDir, { recursive: true });
} catch {}
```
**Problem**: Creates directory immediately when called.

## Files That Write to Session Directory

| File | Path Pattern | When Written |
|------|--------------|--------------|
| History | `{sessionDir}/history.json` | On every message append/set |
| Events | `{sessionDir}/events.json` | On every event emit (if persistEventLog enabled) |
| HTTP Log | `{sessionDir}/http-log.json` | On every HTTP request (if persistHttpLog enabled) |

## Good News: Persistence Layer Already Handles Directory Creation

The `JsonFileMemoryPersistence.save()` in `packages/nuvin-core/src/persistent/memory.ts` (lines 58-62) **already creates the directory lazily**:

```typescript
async save(snapshot: MemorySnapshot<T>): Promise<void> {
  try {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const dir = path.dirname(this.filename);
    if (dir && dir !== '.' && !fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });  // ← Already lazy!
    }
    fs.writeFileSync(this.filename, JSON.stringify(snapshot, null, 2), 'utf-8');
  } catch (err) {
    // ...
  }
}
```

## Proposed Changes

### 1. Remove eager directory creation from `OrchestratorManager`

**File**: `packages/nuvin-cli/source/services/OrchestratorManager.ts`

#### Change 1a: Remove from `init()` (lines 264-267)
```diff
-      // Only create session directories if memPersist is enabled
-      if (this.memPersist) {
-        this.createSessionDirectories(sessionDir);
-      }
```

#### Change 1b: Remove from `createNewConversation()` (lines 916-918)
```diff
-    if (memPersist) {
-      this.createSessionDirectories(sessionDir);
-    }
```

#### Change 1c: Keep `createSessionDirectories` method but make it only called when needed
The method itself is fine - it's just being called too early. We can either:
- Option A: Remove the method entirely (persistence layer handles it)
- Option B: Keep it for explicit operations like `/switch` or `/import`

**Recommendation**: Option A - Remove since `JsonFileMemoryPersistence.save()` handles it.

### 2. Remove eager directory creation from `createNewSession()`

**File**: `packages/nuvin-cli/source/hooks/useSessionManagement.ts`

```diff
export const createNewSession = async (customId?: string, profile?: string): Promise<{ sessionId: string; sessionDir: string }> => {
  const id = customId ?? String(Date.now());
  const dir = sessionsDir(profile);
  const sessionDir = path.join(dir, id);
-  try {
-    await fsp.mkdir(sessionDir, { recursive: true });
-  } catch {}
  return { sessionId: id, sessionDir };
};
```

### 3. Verify all writers handle missing directory

| Component | Creates Dir? | Status |
|-----------|--------------|--------|
| `JsonFileMemoryPersistence.save()` | ✅ Yes | Already handles |
| `PersistingConsoleEventPort` | Uses `JsonFileMemoryPersistence` | ✅ OK |
| HTTP log in `createLLM()` | Needs check | ⚠️ Verify |

### 4. HTTP Log Writer - Already Lazy ✅

**File**: `packages/nuvin-core/src/logger/network.ts` (lines 59-66)

The `NetworkLogger.appendToLogFile()` already creates the directory lazily:

```typescript
// Ensure directory exists
if (dir && dir !== '.') {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch {
    // Directory might already exist
  }
}
```

**No changes needed for HTTP log.**

## Implementation Order

1. ~~**First**: Verify HTTP log writer creates directory~~ ✅ Already lazy
2. **Remove eager `createSessionDirectories()` calls from `OrchestratorManager`**
   - Remove from `init()` (lines 264-267)
   - Remove from `createNewConversation()` (lines 916-918)
3. **Remove eager `mkdir` from `createNewSession()` in `useSessionManagement.ts`**
4. **Test scenarios** (see Testing Checklist)

## Edge Cases to Consider

1. **`switchToSession()`** (line 948): Assumes directory exists - this is correct, keep as is
2. **Session scanning**: `scanAvailableSessions()` only lists existing dirs with history.json - already correct
3. **Profile creation**: Creates `sessions` parent dir (line 71 profile-manager.ts) - keep this, it's the parent not individual session dirs

## Testing Checklist

- [ ] Start app, exit without message → no new session dir created
- [ ] Start app, send message → session dir + history.json created
- [ ] Enable persistEventLog, send message → events.json created in same dir
- [ ] Enable persistHttpLog, send message → http-log.json created in same dir
- [ ] Use `/new` command → no dir created until first message
- [ ] Use `/switch` to existing session → works correctly
- [ ] Load history with `--load` flag → works correctly
