import { PROVIDER_TYPES } from './provider-utils';

export const PROVIDER_METADATA = {
  [PROVIDER_TYPES.OpenAI]: {
    name: 'OpenAI',
    description: 'OpenAI API for various models including GPT-3.5 and GPT-4.',
    apiUrl: 'https://api.openai.com/v1',
  },
  [PROVIDER_TYPES.Anthropic]: {
    name: 'Anthropic',
    description: 'Anthropic API for Claude models.',
    apiUrl: 'https://api.anthropic.com/v1',
  },
  [PROVIDER_TYPES.OpenRouter]: {
    name: 'OpenRouter',
    description: 'OpenRouter API for accessing multiple LLMs.',
    apiUrl: 'https://api.openrouter.ai/v1',
  },
  [PROVIDER_TYPES.GitHub]: {
    name: 'GitHub Copilot',
    description: 'GitHub Copilot for code completion and suggestions.',
    apiUrl: 'https://api.github.com/copilot',
  },
  [PROVIDER_TYPES.OpenAICompatible]: {
    name: 'OpenAI Compatible',
    description: 'Compatible with OpenAI API, allows custom API URLs.',
  },
};

// default provider configuration
export const DEFAULT_PROVIDER_CONFIG = {
  type: PROVIDER_TYPES.OpenAI,
  apiKey: '',
  name: 'Default OpenAI Provider',
  apiUrl: PROVIDER_METADATA[PROVIDER_TYPES.OpenAI].apiUrl,
};
