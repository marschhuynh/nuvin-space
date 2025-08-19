import { FetchGithubCopilotKey as GitHubOAuthFetchGithubCopilotKey } from '@wails/services/githuboauthservice';

export async function fetchGithubCopilotKey(): Promise<string | null> {
  try {
    const token = await GitHubOAuthFetchGithubCopilotKey();
    return token || null;
  } catch (error) {
    console.error('Failed to fetch GitHub Copilot key:', error);
    return null;
  }
}

// Types for window.go are declared in src/types/wails-fs.d.ts
