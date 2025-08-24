package main

import (
	"context"
	"log/slog"
	"strings"
)

// FilteredLogger wraps slog.Logger and filters out asset request logs
type FilteredLogger struct {
	*slog.Logger
}

// NewFilteredLogger creates a new filtered logger that excludes asset request logs
func NewFilteredLogger() *FilteredLogger {
	// Create a custom handler that filters messages
	handler := &FilteredHandler{
		Handler: slog.Default().Handler(),
	}
	
	logger := slog.New(handler)
	return &FilteredLogger{Logger: logger}
}

// FilteredHandler implements slog.Handler with filtering capabilities
type FilteredHandler struct {
	slog.Handler
}

// Handle filters log records before passing them to the underlying handler
func (h *FilteredHandler) Handle(ctx context.Context, r slog.Record) error {
	// Filter out asset request logs
	if shouldFilterRecord(r) {
		return nil // Skip this log entry
	}
	
	return h.Handler.Handle(ctx, r)
}

// shouldFilterRecord determines if a log record should be filtered out
func shouldFilterRecord(r slog.Record) bool {
	msg := r.Message
	
	// Filter out asset request logs that contain these patterns
	assetPatterns := []string{
		"Asset Request:",
		"/node_modules/",
		"chunk-",
		".js duration=",
		".css duration=",
		"code=200 method=GET path=",
	}
	
	for _, pattern := range assetPatterns {
		if strings.Contains(msg, pattern) {
			return true
		}
	}
	
	return false
}

// WithGroup creates a new FilteredHandler with the given group
func (h *FilteredHandler) WithGroup(name string) slog.Handler {
	return &FilteredHandler{
		Handler: h.Handler.WithGroup(name),
	}
}

// WithAttrs creates a new FilteredHandler with the given attributes
func (h *FilteredHandler) WithAttrs(attrs []slog.Attr) slog.Handler {
	return &FilteredHandler{
		Handler: h.Handler.WithAttrs(attrs),
	}
}