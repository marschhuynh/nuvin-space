package main

import (
	"context"

	"nuvin-ui/services"
)

// App struct - simplified to use services
type App struct {
	ctx                    context.Context
	httpProxyService       *services.HTTPProxyService
	githubOAuthService     *services.GitHubOAuthService
	commandExecutorService *services.CommandExecutorService
	streamingService       *services.StreamingService
	fileToolsService       *services.FileToolsService
	mcpToolsService        *services.MCPToolsService
	fileDialogService      *services.FileDialogService
}

// NewApp creates a new App application struct with all services
func NewApp() *App {
	// Create streaming service first (dependency for HTTP proxy)
	streamingService := services.NewStreamingService()

	return &App{
		httpProxyService:       services.NewHTTPProxyService(streamingService),
		githubOAuthService:     services.NewGitHubOAuthService(),
		commandExecutorService: services.NewCommandExecutorService(),
		streamingService:       streamingService,
		fileToolsService:       services.NewFileToolsService(),
		mcpToolsService:        services.NewMCPToolsService(),
		fileDialogService:      services.NewFileDialogService(),
	}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}
