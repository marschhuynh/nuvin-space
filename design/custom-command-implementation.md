# Custom Command Implementation Plan

## Overview

Custom commands allow users to create reusable prompt templates that can be triggered via slash commands (e.g., `/review`, `/init`). Commands are stored as markdown files and support template variables.

## File Structure

### Storage Locations

```
~/.nuvin-cli/commands/                    # Global custom commands (default profile)
~/.nuvin-cli/profiles/<name>/commands/    # Profile-specific commands
.nuvin-cli/commands/                      # Local (project-specific) custom commands
```

### Profile Support

When a profile is active:
- Commands are loaded from profile directory: `~/.nuvin-cli/profiles/<profile>/commands/`
- Profile commands override global commands with same ID
- Local commands still override both profile and global

**Loading Priority (highest to lowest):**
1. Local (`.nuvin-cli/commands/`)
2. Profile (`~/.nuvin-cli/profiles/<name>/commands/`) - when profile active
3. Global (`~/.nuvin-cli/commands/`) - default profile only

### Command File Format (Markdown)

```markdown
---
description: Generate project architecture documentation
---

Analyze the codebase and {{user_prompt}}

Focus on:
- Directory structure
- Key components and their relationships
- Design patterns used
```

**Frontmatter Fields:**
- `description` (required): Short description shown in command list/help
- `enabled` (optional, default: true): Whether command is active

**Body:**
- The prompt template
- `{{user_prompt}}` - Replaced with user's additional input after command

### Command ID

Generated from filename:
- `review.md` → `/review`
- `code-review.md` → `/code-review`

## Architecture

### New Files to Create

```
packages/nuvin-core/src/
├── command-types.ts              # Type definitions
├── command-file-persistence.ts   # File I/O for commands

packages/nuvin-cli/source/
├── components/
│   └── CommandModal/
│       ├── CommandModal.tsx        # Main modal (list + details)
│       ├── CommandList.tsx         # Left panel - command list
│       ├── CommandDetails.tsx      # Right panel - command details
│       ├── useCommandModalState.ts # State management
│       └── useCommandModalKeyboard.ts # Keyboard handlers
│   └── CommandCreation/
│       ├── CommandCreation.tsx     # Create/edit flow
│       ├── CommandForm.tsx         # Form inputs
│       ├── CommandPreview.tsx      # Preview before save
│       └── useCommandCreationState.ts
├── services/
│   └── CustomCommandRegistry.ts    # Registry for custom commands
└── modules/commands/definitions/
    └── command.tsx                 # /command slash command
```

### Type Definitions

```typescript
// packages/nuvin-core/src/command-types.ts

export type CommandSource = 'global' | 'profile' | 'local';

export interface CustomCommandTemplate {
  id: string;                    // Derived from filename (e.g., "review")
  description: string;           // From frontmatter
  prompt: string;                // Template body
  enabled?: boolean;             // Default true
  source: CommandSource;         // Where it's stored
  filePath?: string;             // Full path to file
  shadowedBy?: CommandSource;    // If command is hidden by higher priority source
}

export interface CompleteCustomCommand extends CustomCommandTemplate {
  id: string;
  description: string;
  prompt: string;
  enabled: boolean;
  source: CommandSource;
}
```

### Command File Persistence

```typescript
// packages/nuvin-core/src/command-file-persistence.ts

export interface CommandFilePersistenceOptions {
  globalDir: string;    // ~/.nuvin-cli/commands (default profile)
  profileDir?: string;  // ~/.nuvin-cli/profiles/<name>/commands (active profile)
  localDir: string;     // .nuvin-cli/commands
}

export class CommandFilePersistence {
  async loadAll(): Promise<CustomCommandTemplate[]>;
  async load(filename: string, source: CommandSource): Promise<CustomCommandTemplate | null>;
  async save(command: CustomCommandTemplate): Promise<void>;
  async delete(commandId: string, source: CommandSource): Promise<void>;
  exists(commandId: string, source: CommandSource): boolean;
  
  // Update profile dir when profile changes
  setProfileDir(profileDir: string | undefined): void;
}
```

### Custom Command Registry

```typescript
// packages/nuvin-cli/source/services/CustomCommandRegistry.ts

export interface CustomCommandRegistryOptions {
  globalDir: string;              // ~/.nuvin-cli/commands
  profileDir?: string;            // ~/.nuvin-cli/profiles/<name>/commands
  localDir: string;               // .nuvin-cli/commands
  activeProfile?: string;         // Current profile name (undefined = default)
}

export class CustomCommandRegistry {
  private commands = new Map<string, CompleteCustomCommand>();
  private shadowedCommands = new Map<string, CompleteCustomCommand[]>(); // Track shadowed commands
  private persistence: CommandFilePersistence;
  private activeProfile?: string;
  
  constructor(options: CustomCommandRegistryOptions);
  
  async initialize(): Promise<void>;  // Load all commands from all sources
  
  // Profile management
  setActiveProfile(profile: string | undefined, profileDir: string | undefined): void;
  getActiveProfile(): string | undefined;
  hasActiveProfile(): boolean;
  
  register(command: CustomCommandTemplate): void;
  unregister(commandId: string): void;
  get(commandId: string): CompleteCustomCommand | undefined;
  list(options?: { includeHidden?: boolean }): CompleteCustomCommand[];
  exists(commandId: string): boolean;
  
  // Get shadowed commands (hidden by higher priority sources)
  getShadowed(commandId: string): CompleteCustomCommand[];
  
  // File operations
  async saveToFile(command: CompleteCustomCommand): Promise<void>;
  async deleteFromFile(commandId: string, source: CommandSource): Promise<void>;
  
  // Template rendering
  renderPrompt(commandId: string, userPrompt: string): string;
  
  // Source info
  isBuiltIn(commandId: string): boolean;  // For future built-in commands
  getSource(commandId: string): CommandSource | 'builtin';
  
  // Available scopes for creation (depends on active profile)
  getAvailableScopes(): CommandSource[];
}
```

## UI Components

### CommandModal (follows AgentModal pattern)

**Default Profile:**
```
┌─────────────────────────────────────────────────────────────┐
│ Custom Commands                                              │
├─────────────────────────────────────────────────────────────┤
│ ↑↓ navigate • Space/Enter view • ESC exit                   │
│ N new command • E edit (custom only) • X delete             │
├─────────────────────────────────────────────────────────────┤
│ Commands              │ Details                              │
│ ──────────────────────│──────────────────────────────────────│
│ ● /review      [G]    │ Name: /review                        │
│   /init        [L]    │ Source: global                       │
│   /explain     [G]    │                                      │
│   /test        [L]    │ Description:                         │
│                       │ Review code changes and provide      │
│                       │ feedback on quality, patterns...     │
│                       │                                      │
│                       │ Prompt Template:                     │
│                       │ ─────────────────                    │
│                       │ Review the following code:           │
│                       │ {{user_prompt}}                      │
│                       │                                      │
│                       │ Focus on:                            │
│                       │ - Code quality                       │
│                       │ - Best practices...                  │
└─────────────────────────────────────────────────────────────┘

[G] = Global, [L] = Local
```

**With Active Profile (e.g., "work"):**
```
┌─────────────────────────────────────────────────────────────┐
│ Custom Commands                          Profile: work       │
├─────────────────────────────────────────────────────────────┤
│ ↑↓ navigate • Space/Enter view • ESC exit                   │
│ N new command • E edit (custom only) • X delete             │
├─────────────────────────────────────────────────────────────┤
│ Commands              │ Details                              │
│ ──────────────────────│──────────────────────────────────────│
│ ● /review      [P]    │ Name: /review                        │
│   /init        [L]    │ Source: profile (work)               │
│   /explain     [G]    │                                      │
│   /deploy      [P]    │ Description:                         │
│   /test        [L]    │ Review code with company standards   │
│                       │                                      │
│                       │ ⚠ Shadows: global                    │
│                       │                                      │
│                       │ Prompt Template:                     │
│                       │ ─────────────────                    │
│                       │ Review following our company guide:  │
│                       │ {{user_prompt}}                      │
└─────────────────────────────────────────────────────────────┘

[G] = Global, [P] = Profile, [L] = Local
```

### CommandCreation (follows AgentCreation pattern)

Two modes:
1. **Manual Creation**: User fills in form directly
2. **AI-Assisted**: User describes intent, AI generates template (optional, future)

**Default Profile (no active profile):**
```
┌─────────────────────────────────────────────────────────────┐
│ Create Custom Command                                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Command Name: [review____________]                           │
│ (Will be available as /review)                               │
│                                                              │
│ Description:                                                 │
│ [Review code changes and provide feedback________________]   │
│                                                              │
│ Scope: (●) Global  ( ) Local                                 │
│                                                              │
│ Prompt Template:                                             │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ Review the following code changes:                     │   │
│ │ {{user_prompt}}                                        │   │
│ │                                                        │   │
│ │ Please analyze for:                                    │   │
│ │ - Code quality and readability                         │   │
│ │ - Potential bugs or issues                             │   │
│ │ - Performance considerations                           │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                              │
│ Tip: Use {{user_prompt}} where user input should appear      │
│                                                              │
│ [Cancel]                                    [Save Command]   │
└─────────────────────────────────────────────────────────────┘
```

**With Active Profile (e.g., "work"):**
```
┌─────────────────────────────────────────────────────────────┐
│ Create Custom Command                                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Command Name: [review____________]                           │
│ (Will be available as /review)                               │
│                                                              │
│ Description:                                                 │
│ [Review code changes and provide feedback________________]   │
│                                                              │
│ Scope: ( ) Global  (●) Profile (work)  ( ) Local             │
│                                                              │
│ Prompt Template:                                             │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ Review the following code changes:                     │   │
│ │ {{user_prompt}}                                        │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                              │
│ Tip: Use {{user_prompt}} where user input should appear      │
│                                                              │
│ [Cancel]                                    [Save Command]   │
└─────────────────────────────────────────────────────────────┘
```

**Scope Behavior:**
- `Global`: Saved to `~/.nuvin-cli/commands/` - available in all profiles
- `Profile`: Saved to `~/.nuvin-cli/profiles/<name>/commands/` - only when profile active
- `Local`: Saved to `.nuvin-cli/commands/` - project-specific

Note: "Profile" option only appears when a non-default profile is active.

## Command Registration

### /command Slash Command

```typescript
// packages/nuvin-cli/source/modules/commands/definitions/command.tsx

export function registerCommandCommand(registry: CommandRegistry) {
  registry.register({
    id: '/command',
    type: 'component',
    description: 'Manage custom commands (create, edit, delete).',
    category: 'config',
    component: CommandCommandComponent,
  });
}
```

### Dynamic Command Registration

Custom commands are registered as function commands that inject the rendered prompt:

```typescript
// When loading custom commands
customCommands.forEach(cmd => {
  commandRegistry.register({
    id: `/${cmd.id}`,
    type: 'function',
    description: cmd.description,
    category: 'custom',
    handler: async (ctx) => {
      const userInput = ctx.rawInput.replace(`/${cmd.id}`, '').trim();
      const renderedPrompt = customCommandRegistry.renderPrompt(cmd.id, userInput);
      
      // Inject prompt into chat
      ctx.eventBus.emit('chat:inject', { prompt: renderedPrompt });
    },
  });
});
```

## Implementation Flow

### Startup Flow

```
1. ConfigManager loads → globalDir, localDir paths available
2. ProfileManager initializes → activeProfile, profileDir available
3. CustomCommandRegistry initialized with:
   - globalDir: ~/.nuvin-cli/commands
   - profileDir: ~/.nuvin-cli/profiles/<name>/commands (if profile active)
   - localDir: .nuvin-cli/commands
   - activeProfile: current profile name
4. CommandFilePersistence loads all .md files from all dirs
5. Commands merged with priority: local > profile > global
6. Custom commands registered with CommandRegistry
7. Help command now shows custom commands with source indicators
```

### Create Command Flow

```
1. User triggers /command
2. CommandModal opens
3. User presses 'N' for new
4. CommandCreation form opens
5. User fills name, description, scope, prompt
6. On save:
   a. Validate inputs
   b. Generate filename from name
   c. Write .md file to appropriate dir
   d. Register with CustomCommandRegistry
   e. Register with CommandRegistry (for slash command)
   f. Return to CommandModal (select new command)
```

### Execute Custom Command Flow

```
1. User types: /review check for memory leaks
2. CommandRegistry finds /review
3. Handler extracts user_prompt: "check for memory leaks"
4. Template: "Review this code:\n{{user_prompt}}\n..."
5. Rendered: "Review this code:\ncheck for memory leaks\n..."
6. Inject rendered prompt into chat input
7. Auto-submit or wait for Enter (configurable)
```

### Delete Command Flow

```
1. User in CommandModal, selects command
2. User presses 'X'
3. Confirmation dialog (optional)
4. Delete .md file from filesystem
5. Unregister from CustomCommandRegistry
6. Unregister from CommandRegistry
7. Update CommandModal list
```

## Priority Order (Local > Profile > Global)

When same command ID exists in multiple locations:
1. **Local** takes highest precedence (project-specific)
2. **Profile** overrides global (when profile is active)
3. **Global** is the fallback (default profile)

**Shadowing behavior:**
- Lower priority commands are hidden but not deleted
- UI shows indicator for shadowed commands: `[shadowed by local]`
- Users can view all versions in command details

## Implementation Tasks

### Phase 1: Core Infrastructure
- [ ] Create `command-types.ts` in nuvin-core
- [ ] Create `command-file-persistence.ts` in nuvin-core
- [ ] Create `CustomCommandRegistry.ts` in nuvin-cli
- [ ] Add `getProfileCommandsDir()` to ProfileManager

### Phase 2: UI Components
- [ ] Create `CommandModal/` component folder
- [ ] Create `CommandList.tsx`
- [ ] Create `CommandDetails.tsx` (with shadow indicator)
- [ ] Create `useCommandModalState.ts`
- [ ] Create `useCommandModalKeyboard.ts`
- [ ] Create `CommandModal.tsx`

### Phase 3: Create/Edit Flow
- [ ] Create `CommandCreation/` folder
- [ ] Create `CommandForm.tsx` (with scope selector)
- [ ] Create `CommandPreview.tsx` (optional)
- [ ] Create `useCommandCreationState.ts`
- [ ] Create `CommandCreation.tsx`
- [ ] Add profile scope option (conditional on active profile)

### Phase 4: Integration
- [ ] Create `/command` definition in commands/definitions
- [ ] Integrate CustomCommandRegistry with app startup
- [ ] Pass activeProfile and profileDir to registry
- [ ] Register custom commands dynamically
- [ ] Update help command to show custom commands
- [ ] Add custom command execution logic

### Phase 5: Polish
- [ ] Handle command name conflicts with shadowing
- [ ] Add validation (name format, required fields)
- [ ] Error handling for file I/O
- [ ] Show source indicators [G], [P], [L]
- [ ] Show "shadows" warning in details panel
- [ ] Profile name in modal title when active

## Template Variables (Future Expansion)

Initial support:
- `{{user_prompt}}` - User input after command

Future:
- `{{file:path}}` - Include file content
- `{{selection}}` - Currently selected text (if editor integration)
- `{{git_diff}}` - Git diff output
- `{{date}}` - Current date
- `{{project_name}}` - Project name from package.json
- `{{profile}}` - Current active profile name

## Profile Integration Details

### ProfileManager Addition

```typescript
// Add to packages/nuvin-cli/source/config/profile-manager.ts

getProfileCommandsDir(name: string): string {
  return path.join(this.getProfileDir(name), 'commands');
}
```

### Profile Directory Structure

```
~/.nuvin-cli/
├── commands/                    # Global commands (default profile)
│   ├── review.md
│   └── init.md
├── profiles/
│   ├── work/
│   │   ├── commands/           # Work profile commands
│   │   │   ├── review.md       # Overrides global /review
│   │   │   └── deploy.md
│   │   ├── agents/
│   │   └── config.yaml
│   └── personal/
│       ├── commands/           # Personal profile commands
│       │   └── journal.md
│       ├── agents/
│       └── config.yaml
└── profiles.yaml               # Profile registry
```

### Context Passing

The CustomCommandRegistry needs access to:
1. `ConfigManager.globalDir` → `~/.nuvin-cli`
2. `ConfigManager.getCurrentProfile()` → active profile name
3. `ProfileManager.getProfileCommandsDir(profile)` → profile commands path
4. `ConfigManager.localDir` → `.nuvin-cli`

These are passed during initialization and updated when profile switches.
