export type ProviderKey = 'openrouter' | 'deepinfra' | 'github' | 'zai' | 'echo' | 'anthropic';
export type Provider = ProviderKey;
export type AuthMethod = 'device-flow' | 'token' | 'none' | 'oauth-max' | 'oauth-console';
export type ProviderItem = { label: string; value: Provider };
export type AuthMethodItem = { label: string; value: AuthMethod };

export const MAX_RENDERED_LINES = 2000;

export const PROVIDER_ITEMS: ProviderItem[] = [
  { label: 'OpenRouter', value: 'openrouter' },
  { label: 'DeepInfra', value: 'deepinfra' },
  { label: 'Zai', value: 'zai' },
  { label: 'GitHub (Copilot)', value: 'github' },
  { label: 'Anthropic (Claude)', value: 'anthropic' },
];

export const PROVIDER_LABELS: Record<Provider, string> = PROVIDER_ITEMS.reduce<Record<Provider, string>>(
  (acc, item) => {
    acc[item.value] = item.label;
    return acc;
  },
  {} as Record<Provider, string>,
);

export const PROVIDER_OPTIONS = [
  { label: 'OpenRouter - Wide selection of models', value: 'openrouter' },
  { label: 'DeepInfra - Open source models', value: 'deepinfra' },
  { label: 'Zai - Enterprise AI platform', value: 'zai' },
  { label: 'GitHub Copilot - GitHub integrated models', value: 'github' },
  { label: 'Anthropic - Claude AI models', value: 'anthropic' },
];

export const PROVIDER_AUTH_METHODS: Record<Provider, AuthMethodItem[]> = {
  github: [
    { label: 'Device Flow Login', value: 'device-flow' },
    { label: 'Access Token', value: 'token' },
  ],
  openrouter: [{ label: 'API Key', value: 'token' }],
  deepinfra: [{ label: 'API Key', value: 'token' }],
  zai: [{ label: 'API Key', value: 'token' }],
  anthropic: [
    { label: 'Claude Pro/Max Account', value: 'oauth-max' },
    { label: 'Create API Key', value: 'oauth-console' },
    { label: 'Manually enter API Key', value: 'token' },
  ],
  echo: [{ label: 'No auth needed', value: 'none' }],
};

export const PROVIDER_MODELS: Record<ProviderKey, string[]> = {
  openrouter: ['openai/gpt-4o', 'openai/gpt-4o-mini'],
  deepinfra: ['meta-llama/Meta-Llama-3.1-70B-Instruct', 'meta-llama/Meta-Llama-3.1-8B-Instruct'],
  github: ['claude-sonnet-4.5', 'gpt-4.1', 'gpt-5', 'gpt-5-mini', 'grok-code-fast-1', 'claude-sonnet-4'],
  zai: ['glm-4.6', 'glm-4.5'],
  anthropic: ['claude-sonnet-4-5', 'claude-haiku-4-5', 'claude-sonnet-4'],
  echo: ['echo-model'],
};
