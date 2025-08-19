# Frontend Runtime Router & App Binding

Centralized routing for communication between the React frontend and either:

- Wails v3 runtime (desktop app)
- Gin HTTP server (browser mode)

## Why

To run both as a desktop app and in the browser, the frontend needs a single place that chooses how to perform:

- Generic network calls (with CORS bypass and streaming)
- Invocations of Go/Wails functions (desktop-only)

## API

Import from `nuvin-ui/frontend/src/lib`:

- `runtimeRouter.target`: `'wails' | 'server'`
- `runtimeRouter.isDesktop()`: boolean
- `runtimeRouter.apiFetch(input, init?)`: fetch compatible. Uses Wails proxy in desktop, Gin `/fetch` in browser.
- `runtimeRouter.invoke(method, ...args)`: Calls Wails App methods in desktop via `appBinding`. In browser, posts to server `/runtime/invoke` (currently a stub that returns Not Implemented).

## App Binding (Wails v3)

- File: `nuvin-ui/frontend/src/lib/app-binding.ts`
- Prefers new v3 bindings under `frontend/bindings/**/index.js` as per docs, falls back to legacy `frontend/wailsjs/go/main/App.js`, then `window.go.main.App`.
- Usage examples:
  - `import { appBinding } from '@/lib/app-binding'`
  - `await appBinding.FetchProxy(req)`
  - `await appBinding.ExecuteCommand(cmd)`
  - `await appBinding.FetchGithubCopilotKey()`

This makes desktop calls explicit, typed (via generated bindings), and removes direct references to `window.go`.

## Notes

- The fetch path is already centralized via `smartFetch` and the Go/Gin `/fetch` proxy. Prefer `runtimeRouter.apiFetch` or `smartFetch` for network calls.
- Desktop-only features (filesystem, shell commands, OS dialogs) must use `runtimeRouter.isDesktop()` or feature-detect and provide graceful errors or no-ops in browser.
- Server base URL is configured by `VITE_SERVER_URL` (defaults to `http://localhost:8080`).
