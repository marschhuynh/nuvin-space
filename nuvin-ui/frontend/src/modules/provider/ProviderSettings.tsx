import { useState } from 'react';
import { Plus, Settings, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProviderStore } from '@/store/useProviderStore';
import { ModelStateManager } from '@/modules/agent/components/ModelStateManager';
import type { ProviderConfig } from '@/types';
import { ProviderModal } from './ProviderModal';

interface ProviderSettingsProps {
  onAddProvider: () => void;
}

export function ProviderSettings({ onAddProvider }: ProviderSettingsProps) {
  const { providers, deleteProvider, setActiveProvider, activeProviderId } = useProviderStore();
  const [editingProvider, setEditingProvider] = useState<ProviderConfig | null>(null);
  const [showProviderModal, setShowProviderModal] = useState(false);

  const startEditing = (provider?: ProviderConfig) => {
    if (provider) {
      setEditingProvider(provider);
      setShowProviderModal(true);
    }
  };

  const handleProviderSelect = (provider: ProviderConfig) => {
    setActiveProvider(provider.id);
  };

  return (
    <div className="flex h-full">
      {/* Left Panel - Provider List */}
      <div className="flex flex-col min-w-48 w-70 border-r bg-card">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Providers</h2>
            <span className="px-2 py-1 rounded text-xs bg-muted text-muted-foreground">{providers.length}</span>
          </div>
          <Button size="sm" onClick={onAddProvider}>
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>

        {/* Provider List */}
        <div className="flex-1 overflow-auto p-4">
          {providers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Settings className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-medium text-muted-foreground mb-2">No providers yet</h3>
              <p className="text-sm text-muted-foreground mb-4">Add your first AI provider to get started</p>
              <Button onClick={onAddProvider}>
                <Plus className="h-4 w-4 mr-2" />
                Add New Provider
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {providers.map((provider) => (
                <button
                  key={provider.id}
                  type="button"
                  className={`cursor-pointer w-full text-left p-3 rounded-lg border transition-all hover:shadow-sm focus:outline-none ${
                    activeProviderId === provider.id
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => handleProviderSelect(provider)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleProviderSelect(provider);
                    }
                  }}
                  tabIndex={0}
                  aria-pressed={activeProviderId === provider.id}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Settings className="h-4 w-4 text-blue-500 flex-shrink-0" />
                      <span className="font-medium truncate">{provider.name}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="capitalize">{provider.type || provider.name}</span>
                    <span>•</span>
                    <span>{provider.apiKey ? 'Key added' : 'No key'}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Model Management */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {activeProviderId ? (
          <>
            {/* Header */}
            <div className="p-4 bg-card border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/30">
                    <Settings className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold">Models</h1>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => startEditing(providers.find((p) => p.id === activeProviderId))}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit Provider
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      if (activeProviderId) {
                        deleteProvider(activeProviderId);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>

            {/* Models Content */}
            <div className="flex-1 p-6 min-h-0 overflow-hidden">
              <ModelStateManager />
            </div>
          </>
        ) : (
          // No provider selected
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Settings className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">No provider selected</h3>
              <p className="text-muted-foreground mb-4">Select a provider from the list to manage its models</p>
              <Button onClick={onAddProvider}>
                <Plus className="h-4 w-4 mr-2" />
                Add New Provider
              </Button>
            </div>
          </div>
        )}

        {/* Edit Provider Modal */}
        <ProviderModal
          open={showProviderModal}
          onOpenChange={setShowProviderModal}
          provider={editingProvider}
          mode="edit"
        />
      </div>
    </div>
  );
}
