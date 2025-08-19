package main

import (
	"context"
	"sync"

	"nuvin-ui/services"
)

// App struct - simplified to use services
type App struct {
	ctx                    context.Context
	mcpProcesses           map[string]*MCPProcess
	mcpMutex               sync.RWMutex
	httpProxyService       *services.HTTPProxyService
	githubOAuthService     *services.GitHubOAuthService
	commandExecutorService *services.CommandExecutorService
	streamingService       *services.StreamingService
}

// NewApp creates a new App application struct with all services
func NewApp() *App {
	// Create streaming service first (dependency for HTTP proxy)
	streamingService := services.NewStreamingService()

	return &App{
		mcpProcesses:           make(map[string]*MCPProcess),
		httpProxyService:       services.NewHTTPProxyService(streamingService),
		githubOAuthService:     services.NewGitHubOAuthService(),
		commandExecutorService: services.NewCommandExecutorService(),
		streamingService:       streamingService,
	}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx

	// Initialize all services
	// a.httpProxyService.OnStartup(ctx)
	// a.githubOAuthService.OnStartup(ctx)
	// a.commandExecutorService.OnStartup(ctx)
	// a.streamingService.OnStartup(ctx)

	go a.listenForGlobalShortcut()
	// a.CheckForUpdates()
}

// // FetchProxy delegates to the HTTP proxy service
// func (a *App) FetchProxy(fetchReq services.FetchRequest) services.FetchResponse {
// 	return a.httpProxyService.FetchProxy(fetchReq)
// }

// // FetchGithubCopilotKey delegates to the GitHub OAuth service
// func (a *App) FetchGithubCopilotKey() string {
// 	return a.githubOAuthService.FetchGithubCopilotKey()
// }

// // ExecuteCommand delegates to the command executor service
// func (a *App) ExecuteCommand(cmdReq services.CommandRequest) services.CommandResponse {
// 	return a.commandExecutorService.ExecuteCommand(cmdReq)
// }

// // Greet returns a greeting for the given name (kept for compatibility)
// func (a *App) Greet(name string) string {
// 	return fmt.Sprintf("Hello %s, It's show time!", name)
// }
