import { OpenRouterProvider } from './openrouter-provider';
import { OpenAIProvider } from './openai-provider';
import { AnthropicProvider } from './anthropic-provider';
import { GithubCopilotProvider } from './github-provider';
import { OpenAICompatibleProvider } from './openai-compatible-provider';
import { DeepInfraProvider } from './deepinfra-provider';
import type { LLMProvider } from './types/base';

export type ProviderType = 'openrouter' | 'openai' | 'anthropic' | 'github' | 'openai-compatible' | 'deepinfra';

export interface ProviderConfig {
  type: ProviderType;
  apiKey: string;
  apiUrl?: string;
  customHeaders?: Record<string, string>;
}

export class ProviderFactory {
  constructor() {
    throw new Error('ProviderFactory is a static class and cannot be instantiated.');
  }
  static createProvider(config: ProviderConfig): LLMProvider {
    switch (config.type) {
      case 'openrouter':
        return new OpenRouterProvider(config.apiKey);
      case 'openai':
        return new OpenAIProvider(config.apiKey);
      case 'anthropic':
        return new AnthropicProvider(config.apiKey);
      case 'github':
        return new GithubCopilotProvider(config.apiKey);
      case 'openai-compatible':
        return new OpenAICompatibleProvider(config.apiKey, config.apiUrl);
      case 'deepinfra':
        return new DeepInfraProvider(config.apiKey);
      default:
        throw new Error(`Unsupported provider type: ${config.type}`);
    }
  }

  static getProviderTypes(): ProviderType[] {
    return ['openrouter', 'openai', 'anthropic', 'github', 'openai-compatible', 'deepinfra'];
  }

  static getProviderDisplayName(type: ProviderType): string {
    const displayNames: Record<ProviderType, string> = {
      openrouter: 'OpenRouter',
      openai: 'OpenAI',
      anthropic: 'Anthropic',
      github: 'GitHub Copilot',
      'openai-compatible': 'OpenAI-Compatible API',
      deepinfra: 'DeepInfra',
    };
    return displayNames[type];
  }

  static getProviderDescription(type: ProviderType): string {
    const descriptions: Record<ProviderType, string> = {
      openrouter: 'Access to 100+ models from various providers through OpenRouter',
      openai: 'Direct access to OpenAI models including GPT-4, GPT-4o, and o1',
      anthropic: 'Access to Claude models by Anthropic',
      github: 'GitHub Copilot models for developers',
      'openai-compatible': 'Compatible with any OpenAI-compatible API endpoint',
      deepinfra: 'Access to LLMs with fast inference and competitive pricing',
    };
    return descriptions[type];
  }

  static validateProviderConfig(config: ProviderConfig): boolean {
    if (!config.apiKey || config.apiKey.trim() === '') {
      return false;
    }

    if (!ProviderFactory.getProviderTypes().includes(config.type)) {
      return false;
    }

    return true;
  }
}
