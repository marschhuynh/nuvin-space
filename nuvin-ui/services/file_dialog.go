package services

import (
	"context"
	"os"

	runtime "nuvin-ui/internal/v3compat"
)

// FileDialogService provides file dialog functionality
type FileDialogService struct {
	ctx context.Context
}

// NewFileDialogService creates a new file dialog service
func NewFileDialogService() *FileDialogService {
	return &FileDialogService{}
}

// OnStartup initializes the file dialog service
func (s *FileDialogService) OnStartup(ctx context.Context) {
	s.ctx = ctx
}

// OpenFileDialog opens a file picker dialog and returns the selected file path
func (s *FileDialogService) OpenFileDialog(options runtime.OpenDialogOptions) (string, error) {
	return runtime.OpenFileDialog(s.ctx, options)
}

// SaveFileDialog opens a save file dialog and returns the selected file path
func (s *FileDialogService) SaveFileDialog(options runtime.SaveDialogOptions) (string, error) {
	return runtime.SaveFileDialog(s.ctx, options)
}

// OpenFileDialogAndRead opens a file picker dialog and reads the file content
func (s *FileDialogService) OpenFileDialogAndRead(options runtime.OpenDialogOptions) (string, error) {
	filePath, err := runtime.OpenFileDialog(s.ctx, options)
	if err != nil {
		return "", err
	}

	if filePath == "" {
		return "", nil // User cancelled
	}

	content, err := os.ReadFile(filePath)
	if err != nil {
		return "", err
	}

	return string(content), nil
}
