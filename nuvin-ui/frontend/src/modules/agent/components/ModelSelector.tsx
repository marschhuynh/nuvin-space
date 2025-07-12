import { useState, useEffect } from 'react';
import { Loader2, AlertCircle, Info } from 'lucide-react';
import { ModelInfo } from '@/lib/providers/llm-provider';
import {
  LLMProviderConfig,
  fetchProviderModels,
} from '@/lib/providers/provider-utils';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ModelSelectView } from './ModelSelectView';

interface ModelSelectorProps {
  providerConfig: LLMProviderConfig;
  selectedModel?: string;
  onModelSelect: (modelId: string) => void;
  disabled?: boolean;
  className?: string;
}

export function ModelSelector({
  providerConfig,
  selectedModel,
  onModelSelect,
  disabled = false,
  className,
}: ModelSelectorProps) {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadModels() {
      if (!providerConfig?.apiKey) {
        setModels([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const fetchedModels = await fetchProviderModels(providerConfig);
        setModels(fetchedModels);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to load models';
        setError(errorMessage);
        setModels([]);
        console.error('Failed to fetch models:', err);
      } finally {
        setLoading(false);
      }
    }

    loadModels();
  }, [providerConfig]);

  const handleRefresh = () => {
    if (!loading && providerConfig?.apiKey) {
      setError(null);
      setModels([]);
      // Trigger useEffect by updating a dependency
      const loadModels = async () => {
        setLoading(true);
        try {
          const fetchedModels = await fetchProviderModels(providerConfig);
          setModels(fetchedModels);
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : 'Failed to load models';
          setError(errorMessage);
          setModels([]);
        } finally {
          setLoading(false);
        }
      };
      loadModels();
    }
  };

  if (loading) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 p-4 border rounded-lg bg-muted/50',
          className,
        )}
      >
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Loading models...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={cn(
          'p-4 border border-destructive/20 rounded-lg bg-destructive/5',
          className,
        )}
      >
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-destructive">
              Error loading models: {error}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="mt-2 h-7 text-xs"
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (models.length === 0) {
    return (
      <div className={cn('p-4 border rounded-lg bg-muted/50', className)}>
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {!providerConfig?.apiKey
              ? 'Enter an API key to load models'
              : 'No models available'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      <ModelSelectView
        models={models}
        selectedModel={selectedModel}
        onModelSelect={onModelSelect}
        disabled={disabled}
      />
    </div>
  );
}
