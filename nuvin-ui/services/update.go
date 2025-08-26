package services

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"runtime"
	"time"

	wruntime "nuvin-ui/internal/v3compat"
)

const (
	currentVersion  = "1.0.0"
	githubLatestURL = "https://api.github.com/repos/owner/repo/releases/latest"
)

// GitHubRelease represents minimal GitHub release information
type GitHubRelease struct {
	TagName string `json:"tag_name"`
	Assets  []struct {
		Name               string `json:"name"`
		BrowserDownloadURL string `json:"browser_download_url"`
	} `json:"assets"`
}

// UpdateService provides simple in-app update checks.
type UpdateService struct {
	ctx context.Context
}

func NewUpdateService() *UpdateService { return &UpdateService{} }

// OnStartup captures Wails context for dialogs/logging.
func (s *UpdateService) OnStartup(ctx context.Context) { s.ctx = ctx }

// CheckForUpdates fetches latest release info and prompts the user to update.
func (s *UpdateService) CheckForUpdates() {
	go func() {
		client := &http.Client{Timeout: 15 * time.Second}
		req, err := http.NewRequest("GET", githubLatestURL, nil)
		if err != nil {
			wruntime.LogError(s.ctx, fmt.Sprintf("update check error: %v", err))
			return
		}
		req.Header.Set("User-Agent", "nuvin-space")
		resp, err := client.Do(req)
		if err != nil {
			wruntime.LogError(s.ctx, fmt.Sprintf("update check error: %v", err))
			return
		}
		defer resp.Body.Close()
		if resp.StatusCode != http.StatusOK {
			wruntime.LogError(s.ctx, fmt.Sprintf("update check failed: %d", resp.StatusCode))
			return
		}

		var rel GitHubRelease
		if err := json.NewDecoder(resp.Body).Decode(&rel); err != nil {
			wruntime.LogError(s.ctx, fmt.Sprintf("update decode error: %v", err))
			return
		}
		if rel.TagName == "" || rel.TagName == currentVersion {
			return
		}

		selection, err := wruntime.MessageDialog(s.ctx, wruntime.MessageDialogOptions{
			Type:          wruntime.QuestionDialog,
			Title:         "Update Available",
			Message:       fmt.Sprintf("A new version (%s) is available. Update now?", rel.TagName),
			Buttons:       []string{"OK", "Cancel"},
			DefaultButton: "OK",
			CancelButton:  "Cancel",
		})
		if err != nil || selection != "OK" {
			return
		}

		assetURL := ""
		target := fmt.Sprintf("nuvin-space-%s-%s", runtime.GOOS, runtime.GOARCH)
		for _, a := range rel.Assets {
			if a.Name == target {
				assetURL = a.BrowserDownloadURL
				break
			}
		}
		if assetURL == "" {
			wruntime.LogError(s.ctx, "update asset not found")
			return
		}

		if err := s.downloadAndReplace(assetURL); err != nil {
			wruntime.LogError(s.ctx, fmt.Sprintf("update failed: %v", err))
			return
		}

		wruntime.MessageDialog(s.ctx, wruntime.MessageDialogOptions{
			Type:    wruntime.InfoDialog,
			Title:   "Update Installed",
			Message: "The application has been updated. Please restart to use the new version.",
		})
	}()
}

func (s *UpdateService) downloadAndReplace(url string) error {
	resp, err := http.Get(url)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	tmp, err := os.CreateTemp("", "nuvin-update-*")
	if err != nil {
		return err
	}
	defer tmp.Close()

	if _, err := io.Copy(tmp, resp.Body); err != nil {
		return err
	}

	execPath, err := os.Executable()
	if err != nil {
		return err
	}

	backup := execPath + ".old"
	os.Rename(execPath, backup)
	if err := os.Rename(tmp.Name(), execPath); err != nil {
		os.Rename(backup, execPath)
		return err
	}
	os.Chmod(execPath, 0755)
	os.Remove(backup)
	return nil
}
