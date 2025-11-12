import { getAvailableProviders } from '@nuvin/nuvin-core';

const SPECIAL_PROVIDERS = ['github', 'anthropic'] as const;

type SpecialProvider = (typeof SPECIAL_PROVIDERS)[number];

export type ProviderKey = string;

export function getAllProviders(customProviders?: string[]): string[] {
  const factoryProviders = customProviders || getAvailableProviders();
  return [...factoryProviders, ...SPECIAL_PROVIDERS];
}

export const ALL_PROVIDERS = getAllProviders();

export type ProviderItem = { label: string; value: ProviderKey };

const DEFAULT_PROVIDER_LABELS: Record<string, string> = {
  openrouter: 'OpenRouter',
  deepinfra: 'DeepInfra',
  zai: 'Zai',
  moonshot: 'Moonshot',
  lmstudio: 'LM Studio',
  github: 'GitHub (Copilot)',
  anthropic: 'Anthropic (Claude)',
};

const DEFAULT_PROVIDER_DESCRIPTIONS: Record<string, string> = {
  openrouter: 'Wide selection of models',
  deepinfra: 'Open source models',
  zai: 'Enterprise AI platform',
  moonshot: 'Moonshot AI models',
  lmstudio: 'Local LLM server',
  github: 'GitHub integrated models',
  anthropic: 'Claude AI models',
};

export function getProviderLabel(provider: string): string {
  return DEFAULT_PROVIDER_LABELS[provider] || provider.charAt(0).toUpperCase() + provider.slice(1);
}

export function getProviderDescription(provider: string): string {
  return DEFAULT_PROVIDER_DESCRIPTIONS[provider] || 'Custom provider';
}

export function buildProviderItems(providers?: string[]): ProviderItem[] {
  const allProviders = providers || ALL_PROVIDERS;
  return allProviders.map((provider) => ({
    label: getProviderLabel(provider),
    value: provider,
  }));
}

export function buildProviderOptions(providers?: string[]): ProviderItem[] {
  const allProviders = providers || ALL_PROVIDERS;
  return allProviders.map((provider) => ({
    label: `${getProviderLabel(provider)} - ${getProviderDescription(provider)}`,
    value: provider,
  }));
}

export const PROVIDER_LABELS = DEFAULT_PROVIDER_LABELS;
export const PROVIDER_DESCRIPTIONS = DEFAULT_PROVIDER_DESCRIPTIONS;
export const PROVIDER_ITEMS: ProviderItem[] = buildProviderItems();
export const PROVIDER_OPTIONS = buildProviderOptions();

export function isFactoryProvider(provider: ProviderKey): boolean {
  return !isSpecialProvider(provider);
}

export function isSpecialProvider(provider: ProviderKey): boolean {
  return SPECIAL_PROVIDERS.includes(provider as SpecialProvider);
}
