package main

import (
	"embed"
	"log/slog"

	compat "nuvin-ui/internal/v3compat"
	"nuvin-ui/services"

	"github.com/wailsapp/wails/v3/pkg/application"
)

// In v3, embed the whole frontend directory and let the dev server override
// when FRONTEND_DEVSERVER_URL is present.
//
//go:embed all:frontend/dist
var assets embed.FS

func main() {
	debugSvc := NewDebug()

	// Create standalone service instances
	streamingService := services.NewStreamingService()
	httpProxyService := services.NewHTTPProxyService(streamingService)
	githubOAuthService := services.NewGitHubOAuthService()
	commandExecutorService := services.NewCommandExecutorService()
	fileDialogService := services.NewFileDialogService()
	fileToolsService := services.NewFileToolsService()
	mcpToolsService := services.NewMCPToolsService()
	updateService := services.NewUpdateService()

	app := application.New(application.Options{
		Name:        "Nuvin Space",
		Description: "Nuvin Space Application",
		Mac: application.MacOptions{
			ApplicationShouldTerminateAfterLastWindowClosed: false,
		},
		Assets: application.AssetOptions{
			Handler: application.BundledAssetFileServer(assets),
		},
		Logger:   NewFilteredLogger().Logger,
		LogLevel: slog.LevelInfo,
		Services: []application.Service{
			application.NewService(debugSvc),
			application.NewService(updateService),
			application.NewService(httpProxyService),
			application.NewService(githubOAuthService),
			application.NewService(commandExecutorService),
			application.NewService(streamingService),
			application.NewService(fileDialogService),
			application.NewService(fileToolsService),
			application.NewService(mcpToolsService),
		},
	})

	// Create the main window
	win := app.Window.NewWithOptions(application.WebviewWindowOptions{
		Title:            "Nuvin Space",
		Width:            1224,
		Height:           768,
		MinWidth:         1224,
		MinHeight:        768,
		BackgroundColour: application.NewRGB(27, 38, 54),
		DevToolsEnabled:  false,
	})

	// Initialize v3 compat helpers
	compat.Init(app, win)

	if err := app.Run(); err != nil {
		println("Error:", err.Error())
	}
}
