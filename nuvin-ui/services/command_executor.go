package services

import (
	"context"
	"fmt"
	"io"
	"os"
	"os/exec"
	"time"

	runtime "nuvin-ui/internal/v3compat"
)

// CommandRequest represents a command execution request
type CommandRequest struct {
	Command     string            `json:"command"`
	Args        []string          `json:"args,omitempty"`
	WorkingDir  string            `json:"workingDir,omitempty"`
	Env         map[string]string `json:"env,omitempty"`
	Timeout     int               `json:"timeout,omitempty"` // timeout in seconds
	Description string            `json:"description,omitempty"`
}

// CommandResponse represents the response from command execution
type CommandResponse struct {
	Success   bool   `json:"success"`
	ExitCode  int    `json:"exitCode"`
	Stdout    string `json:"stdout"`
	Stderr    string `json:"stderr"`
	Error     string `json:"error,omitempty"`
	Duration  int64  `json:"duration"` // duration in milliseconds
	Truncated bool   `json:"truncated,omitempty"`
}

// CommandExecutorService executes shell commands and returns the result
type CommandExecutorService struct {
	ctx context.Context
}

// NewCommandExecutorService creates a new command executor service
func NewCommandExecutorService() *CommandExecutorService {
	return &CommandExecutorService{}
}

// OnStartup initializes the command executor service
func (s *CommandExecutorService) OnStartup(ctx context.Context) {
	s.ctx = ctx
}

// ExecuteCommand executes a shell command and returns the result
func (s *CommandExecutorService) ExecuteCommand(cmdReq CommandRequest) CommandResponse {
	startTime := time.Now()

	// Security check: Don't allow empty commands
	if cmdReq.Command == "" {
		return CommandResponse{
			Success:  false,
			ExitCode: -1,
			Error:    "Command cannot be empty",
			Duration: time.Since(startTime).Milliseconds(),
		}
	}

	// Set default timeout to 2 minutes if not specified
	timeout := 120
	if cmdReq.Timeout > 0 {
		timeout = cmdReq.Timeout
	}

	// Create context with timeout
	ctx, cancel := context.WithTimeout(context.Background(), time.Duration(timeout)*time.Second)
	defer cancel()

	// Create command
	var cmd *exec.Cmd
	if len(cmdReq.Args) > 0 {
		cmd = exec.CommandContext(ctx, cmdReq.Command, cmdReq.Args...)
	} else {
		// For shell commands, use the default shell from SHELL environment variable
		shell := os.Getenv("SHELL")
		if shell == "" {
			// Fallback to sh if SHELL is not set
			shell = "sh"
		}
		cmd = exec.CommandContext(ctx, shell, "-c", cmdReq.Command)
	}

	// Set working directory if specified
	if cmdReq.WorkingDir != "" {
		cmd.Dir = cmdReq.WorkingDir
	}

	// Set environment variables
	if len(cmdReq.Env) > 0 {
		env := os.Environ()
		for key, value := range cmdReq.Env {
			env = append(env, fmt.Sprintf("%s=%s", key, value))
		}
		cmd.Env = env
	}

	// Log command execution
	runtime.LogInfo(s.ctx, fmt.Sprintf("Executing command: %s %v (timeout: %ds)", cmdReq.Command, cmdReq.Args, timeout))

	// Execute command and capture output
	stdout, stderr, err := s.runCommandWithLimits(cmd)
	duration := time.Since(startTime).Milliseconds()

	// Determine exit code
	exitCode := 0
	if err != nil {
		if exitError, ok := err.(*exec.ExitError); ok {
			exitCode = exitError.ExitCode()
		} else {
			exitCode = -1
		}
	}

	// Check for timeout
	if ctx.Err() == context.DeadlineExceeded {
		return CommandResponse{
			Success:  false,
			ExitCode: -1,
			Stdout:   stdout,
			Stderr:   stderr,
			Error:    fmt.Sprintf("Command timed out after %d seconds", timeout),
			Duration: duration,
		}
	}

	// Return response
	response := CommandResponse{
		Success:  err == nil,
		ExitCode: exitCode,
		Stdout:   stdout,
		Stderr:   stderr,
		Duration: duration,
	}

	if err != nil && response.Error == "" {
		response.Error = err.Error()
	}

	return response
}

// runCommandWithLimits runs a command with output size limits
func (s *CommandExecutorService) runCommandWithLimits(cmd *exec.Cmd) (stdout, stderr string, err error) {
	const maxOutputSize = 30000 // 30KB limit to match Claude Code's limit

	stdoutPipe, err := cmd.StdoutPipe()
	if err != nil {
		return "", "", err
	}

	stderrPipe, err := cmd.StderrPipe()
	if err != nil {
		return "", "", err
	}

	err = cmd.Start()
	if err != nil {
		return "", "", err
	}

	// Read stdout with limit
	stdoutBytes := make([]byte, maxOutputSize)
	stdoutRead, _ := io.ReadFull(stdoutPipe, stdoutBytes)
	if stdoutRead == maxOutputSize {
		// Check if there's more data
		extraBytes := make([]byte, 1)
		if n, _ := stdoutPipe.Read(extraBytes); n > 0 {
			stdout = string(stdoutBytes) + "\n... (output truncated)"
		} else {
			stdout = string(stdoutBytes[:stdoutRead])
		}
	} else {
		stdout = string(stdoutBytes[:stdoutRead])
	}

	// Read stderr with limit
	stderrBytes := make([]byte, maxOutputSize)
	stderrRead, _ := io.ReadFull(stderrPipe, stderrBytes)
	if stderrRead == maxOutputSize {
		// Check if there's more data
		extraBytes := make([]byte, 1)
		if n, _ := stderrPipe.Read(extraBytes); n > 0 {
			stderr = string(stderrBytes) + "\n... (output truncated)"
		} else {
			stderr = string(stderrBytes[:stderrRead])
		}
	} else {
		stderr = string(stderrBytes[:stderrRead])
	}

	err = cmd.Wait()
	return stdout, stderr, err
}
