PTY-Based Session Management Design

Based on my research, here's a much better architecture using PTY (pseudo-terminal) for true persistent shell sessions:

Problems with Current Approach

1. Command Effect Parsing: Fragile regex-based parsing that misses complex shell behaviors
2. Incomplete State Tracking: Can't capture all environment changes (aliases, functions, etc.)
3. No Interactive Support: Can't handle commands requiring user input
4. Limited Shell Features: Missing shell history, completion, job control

PTY-Based Solution Architecture

Backend Changes (Go):
// Enhanced CommandExecutorService with PTY sessions
type PTYSession struct {
    ID          string
    PTY         *os.File
    Cmd         *exec.Cmd
    WorkingDir  string
    CreatedAt   time.Time
    LastUsed    time.Time
    OutputBuf   *CircularBuffer
    mu          sync.Mutex
}

type CommandExecutorService struct {
    sessions map[string]*PTYSession
    mu       sync.RWMutex
}

// New methods needed:
func (s *CommandExecutorService) CreateSession(sessionID string) error
func (s *CommandExecutorService) SendCommand(sessionID, command string) (*CommandResponse, error)
func (s *CommandExecutorService) GetSessionOutput(sessionID string) (string, error)
func (s *CommandExecutorService) CloseSession(sessionID string) error

Key Implementation Steps:

1. Add PTY Dependency:
go get github.com/creack/pty
2. Session Creation:
cmd := exec.Command("bash")
ptmx, err := pty.Start(cmd)
// Store ptmx handle for persistent session
3. Command Execution:
// Send command to existing shell
ptmx.Write([]byte(command + "\n"))

// Read output with timeout
output := readWithTimeout(ptmx, timeout)
4. Output Management:
// Circular buffer for session output
type CircularBuffer struct {
    data []byte
    size int
    pos  int
}

Frontend Changes

- Keep existing bashTool interface
- Add sessionTool for session lifecycle
- Remove fragile command parsing logic
- Sessions persist until explicitly closed

Benefits of PTY Approach

True Shell Behavior:
- All shell features work naturally (aliases, functions, history)
- Environment variables persist correctly
- Interactive commands supported
- Job control and signal handling

Robust Implementation:
- No command parsing required
- True working directory persistence
- Complete environment state maintained
- Shell-specific features (bash, zsh, fish) work out of box

Better Performance:
- Single shell process per session
- No process creation overhead per command
- Streaming output possible
- Lower resource usage

Implementation Considerations

Session Management:
- Sessions stored in Go backend memory
- Automatic cleanup after inactivity
- Session isolation and security
- Resource limits per session

Output Handling:
- Circular buffer for output history
- ANSI escape sequence handling
- Output size limits
- Real-time streaming capability

Error Handling:
- Shell process death detection
- PTY errors and recovery
- Timeout management
- Resource cleanup

This PTY-based approach would eliminate all the brittle command parsing and provide true shell session persistence that works exactly
as users expect.

Would you like me to proceed with implementing this PTY-based approach in the Go backend?

