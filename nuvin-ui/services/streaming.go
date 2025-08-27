package services

import (
	"bufio"
	"context"
	"fmt"
	"io"
	"time"

	runtime "nuvin-ui/internal/v3compat"
)

// StreamChunk represents a chunk of streamed data
type StreamChunk struct {
	StreamID string `json:"streamId"`
	Data     string `json:"data"`
	Done     bool   `json:"done"`
	Error    string `json:"error,omitempty"`
}

// StreamingService handles streaming response data via Wails events
type StreamingService struct {
	ctx context.Context
}

// NewStreamingService creates a new streaming service
func NewStreamingService() *StreamingService {
	return &StreamingService{}
}

// OnStartup initializes the streaming service
func (s *StreamingService) OnStartup(ctx context.Context) {
	s.ctx = ctx
}

// streamResponse handles streaming response data via Wails events
// Note: unexported to avoid Wails binding generation for io.ReadCloser param
func (s *StreamingService) streamResponse(streamID string, body io.ReadCloser) {
    defer body.Close()

	// Small delay to ensure frontend event listener is set up
	time.Sleep(100 * time.Millisecond)
	runtime.LogInfo(s.ctx, fmt.Sprintf("Stream [%s] starting to read data", streamID[:8]))

    reader := bufio.NewReader(body)
    buffer := make([]byte, 1024) // 1KB chunks

	for {
		n, err := reader.Read(buffer)
        if n > 0 {
            // Send chunk via event
            chunkData := string(buffer[:n])
            runtime.LogInfo(s.ctx, fmt.Sprintf("Streaming chunk [%s] (%d bytes): %s", streamID[:8], n, chunkData))
            // Emit payload with lowerCamelCase keys to align with TS expectations
            payload := map[string]any{
                "streamId": streamID,
                "data":     chunkData,
                "done":     false,
            }
            runtime.EventsEmit(s.ctx, fmt.Sprintf("fetch-stream-chunk:%s", streamID), payload)
        }

		if err != nil {
            if err == io.EOF {
                // Send completion signal
                payload := map[string]any{
                    "streamId": streamID,
                    "data":     "",
                    "done":     true,
                }
                runtime.EventsEmit(s.ctx, fmt.Sprintf("fetch-stream-chunk:%s", streamID), payload)
            } else {
                // Send error
                payload := map[string]any{
                    "streamId": streamID,
                    "data":     "",
                    "done":     true,
                    "error":    err.Error(),
                }
                runtime.EventsEmit(s.ctx, fmt.Sprintf("fetch-stream-chunk:%s", streamID), payload)
            }
            break
        }
    }
}
