# OpenRouter LLM Provider

OpenRouter provides access to multiple LLM providers through a unified API. This document describes the OpenRouter integration in the nuvin-core package.

## Overview

The `OpenRouterLLM` class provides:
- Unified API for multiple LLM providers
- Model discovery and listing
- Competitive pricing
- Automatic fallback routing

## Documentation

- **Models Overview**: https://openrouter.ai/docs/overview/models
- **API Reference**: https://openrouter.ai/docs/api-reference/models/get-models
- **Get API Key**: https://openrouter.ai/settings/keys

## Usage

### Basic Usage

```typescript
import { OpenRouterLLM } from '@nuvin/core/llm-providers';

const llm = new OpenRouterLLM({ 
  apiKey: 'sk-or-v1-...' 
});

// Generate completion
const result = await llm.generateCompletion({
  model: 'anthropic/claude-3.5-sonnet',
  messages: [{ role: 'user', content: 'Hello!' }],
  temperature: 0.7,
  topP: 1,
  maxTokens: 1000
});
```

### List Available Models

The `getModels()` method retrieves all available models from OpenRouter:

```typescript
import { OpenRouterLLM, type OpenRouterModel } from '@nuvin/core/llm-providers';

const llm = new OpenRouterLLM({ apiKey: 'sk-or-v1-...' });

// Fetch all available models
const models: OpenRouterModel[] = await llm.getModels();

console.log(`Total models: ${models.length}`);

// Filter by criteria
const visionModels = models.filter(m => 
  m.architecture.input_modalities.includes('image')
);

const affordableModels = models.filter(m => 
  parseFloat(m.pricing.prompt) < 0.000001
);

// Find specific model
const claude = models.find(m => m.id.includes('claude-3.5-sonnet'));
```

## Model Information

Each model returned by `getModels()` includes:

### Basic Information
- `id` - Model identifier (e.g., `"anthropic/claude-3.5-sonnet"`)
- `name` - Human-readable name (e.g., `"Anthropic: Claude 3.5 Sonnet"`)
- `description` - Model description and capabilities
- `created` - Unix timestamp of model creation
- `context_length` - Maximum context window size in tokens

### Architecture
- `modality` - Input/output types (e.g., `"text+image->text"`)
- `input_modalities` - Array of supported inputs (e.g., `["text", "image"]`)
- `output_modalities` - Array of supported outputs (e.g., `["text"]`)
- `tokenizer` - Tokenizer used by the model
- `instruct_type` - Instruction format type (if applicable)

### Pricing (per token in USD)
- `prompt` - Cost for input tokens
- `completion` - Cost for output tokens
- `request` - Base cost per request
- `image` - Cost per image input
- `web_search` - Cost for web search capability
- `internal_reasoning` - Cost for extended reasoning
- `input_cache_read` - Cost for cached input tokens

### Provider Info
- `top_provider.context_length` - Provider's context window
- `top_provider.max_completion_tokens` - Maximum output tokens
- `top_provider.is_moderated` - Whether content moderation is enabled

### Parameters
- `supported_parameters` - Array of supported parameters (e.g., `["temperature", "top_p", "tools"]`)
- `default_parameters` - Default values for temperature, top_p, and frequency_penalty
- `per_request_limits` - Rate limits (if applicable)

## Examples

### Filter Models by Price

```typescript
const llm = new OpenRouterLLM({ apiKey: 'sk-or-v1-...' });
const models = await llm.getModels();

// Find cheapest models for prototyping
const cheapModels = models
  .filter(m => parseFloat(m.pricing.prompt) < 0.0000005)
  .sort((a, b) => parseFloat(a.pricing.prompt) - parseFloat(b.pricing.prompt))
  .slice(0, 10);

cheapModels.forEach(m => {
  console.log(`${m.name}: $${m.pricing.prompt}/token`);
});
```

### Filter Vision-Capable Models

```typescript
const llm = new OpenRouterLLM({ apiKey: 'sk-or-v1-...' });
const models = await llm.getModels();

const visionModels = models.filter(m => 
  m.architecture.input_modalities.includes('image')
);

console.log('Vision-capable models:');
visionModels.forEach(m => {
  console.log(`- ${m.name} (${m.id})`);
  console.log(`  Context: ${m.context_length} tokens`);
  console.log(`  Price: $${m.pricing.prompt}/prompt + $${m.pricing.completion}/completion`);
});
```

### Find Models by Context Length

```typescript
const llm = new OpenRouterLLM({ apiKey: 'sk-or-v1-...' });
const models = await llm.getModels();

// Models with 200k+ context
const longContextModels = models
  .filter(m => m.context_length >= 200000)
  .sort((a, b) => b.context_length - a.context_length);

console.log('Long context models:');
longContextModels.forEach(m => {
  console.log(`- ${m.name}: ${m.context_length.toLocaleString()} tokens`);
});
```

### Check Tool Support

```typescript
const llm = new OpenRouterLLM({ apiKey: 'sk-or-v1-...' });
const models = await llm.getModels();

const toolModels = models.filter(m => 
  m.supported_parameters.includes('tools')
);

console.log(`${toolModels.length} models support function calling`);
```

## Testing

A test script is provided to verify the API integration:

```bash
# Set your API key and run the test
OPENROUTER_API_KEY=sk-or-v1-... npx tsx packages/nuvin-core/llm-providers/test-openrouter-models.ts
```

The test script will:
1. Fetch all available models
2. Display total count
3. Show detailed info for first 5 models
4. List first 20 model IDs

## Type Definition

```typescript
export type OpenRouterModel = {
  id: string;
  canonical_slug: string;
  hugging_face_id: string;
  name: string;
  created: number;
  description: string;
  context_length: number;
  architecture: {
    modality: string;
    input_modalities: string[];
    output_modalities: string[];
    tokenizer: string;
    instruct_type: string | null;
  };
  pricing: {
    prompt: string;
    completion: string;
    request: string;
    image: string;
    web_search: string;
    internal_reasoning: string;
    input_cache_read: string;
  };
  top_provider: {
    context_length: number;
    max_completion_tokens: number | null;
    is_moderated: boolean;
  };
  per_request_limits: {
    prompt_tokens: string;
    completion_tokens: string;
  } | null;
  supported_parameters: string[];
  default_parameters: {
    temperature: number | null;
    top_p: number | null;
    frequency_penalty: number | null;
  };
};
```

## Constructor Options

```typescript
type OpenRouterOptions = {
  apiKey?: string;           // OpenRouter API key
  apiUrl?: string;           // Custom API URL (default: https://openrouter.ai/api/v1)
  httpLogFile?: string;      // Path to log HTTP requests/responses
};
```

## Methods

### `getModels(signal?: AbortSignal): Promise<OpenRouterModel[]>`

Fetches the complete list of available models from OpenRouter.

**Parameters:**
- `signal` - Optional AbortSignal for request cancellation

**Returns:**
- Array of OpenRouterModel objects

**Throws:**
- Error if API key is missing or request fails

**Example:**
```typescript
const llm = new OpenRouterLLM({ apiKey: 'sk-or-v1-...' });

// With abort signal
const controller = new AbortController();
setTimeout(() => controller.abort(), 5000); // 5 second timeout

try {
  const models = await llm.getModels(controller.signal);
  console.log(`Found ${models.length} models`);
} catch (error) {
  if (error.name === 'AbortError') {
    console.log('Request timed out');
  }
}
```

## Notes

- All pricing values are strings representing cost per token in USD
- Context lengths vary by model and provider
- Some models may have usage limits (`per_request_limits`)
- The `top_provider` field indicates the best available provider for that model
- Models list is updated regularly by OpenRouter
