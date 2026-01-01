import type React from 'react';
import type { AgentTemplate } from '@nuvin/nuvin-core';
import { useAgentCreationState } from './useAgentCreationState.js';
import { useAgentCreationKeyboard } from './useAgentCreationKeyboard.js';
import { AgentDescriptionInput } from './AgentDescriptionInput.js';
import { AgentPreview } from './AgentPreview.js';
import { AgentForm } from './AgentForm.js';
import { AgentLoading } from './AgentLoading.js';
import { AgentError } from './AgentError.js';

interface AgentCreationProps {
  visible: boolean;
  onGenerate: (description: string) => void;
  onCancel: () => void;
  onConfirm?: (nextPreview?: Partial<AgentTemplate> & { systemPrompt: string }) => void;
  onEditPreview?: () => void;
  onUpdatePreview?: (nextPreview: Partial<AgentTemplate> & { systemPrompt: string }) => void;
  availableTools?: string[];
  loading?: boolean;
  error?: string;
  preview?: Partial<AgentTemplate> & { systemPrompt: string };
  mode?: 'create' | 'edit';
  navigationSource?: 'agent-config' | 'direct';
}

export const AgentCreation: React.FC<AgentCreationProps> = ({
  visible,
  onGenerate,
  onCancel,
  onConfirm,
  onUpdatePreview,
  availableTools = [],
  loading = false,
  error,
  preview,
  mode = 'create',
}) => {
  const state = useAgentCreationState(mode, preview, onUpdatePreview, onConfirm);

  useAgentCreationKeyboard({
    visible,
    state,
    actions: state,
    onCancel,
    onConfirm,
    loading,
  });

  if (!visible) return null;

  if (loading) {
    return <AgentLoading mode={mode} />;
  }

  if (mode === 'create' && error) {
    return <AgentError error={error} />;
  }

  if (state.isEditing && preview) {
    return (
      <AgentForm
        mode={mode}
        preview={preview}
        availableTools={availableTools}
        editedName={state.editedName}
        editedId={state.editedId}
        editedDescription={state.editedDescription}
        editedTools={state.editedTools}
        editedTemperature={state.editedTemperature}
        editedSystemPrompt={state.editedSystemPrompt}
        editedModel={state.editedModel}
        error={error}
        onFieldChange={(field, value) => {
          switch (field) {
            case 'name':
              state.setEditedName(value);
              break;
            case 'id':
              state.setEditedId(value);
              break;
            case 'model':
              state.setEditedModel(value);
              break;
            case 'temperature':
              state.setEditedTemperature(value);
              break;
            case 'description':
              state.setEditedDescription(value);
              break;
          }
        }}
        onToolsChange={state.setEditedTools}
      />
    );
  }

  if (mode === 'create' && state.showPreview && preview) {
    return (
      <AgentPreview
        preview={preview}
        onSave={() => {
          onConfirm?.();
          state.setDescription('');
          state.setShowPreview(false);
        }}
        onEdit={() => {
          state.handleStartEditing();
        }}
      />
    );
  }

  if (mode === 'edit') {
    return null;
  }

  return (
    <AgentDescriptionInput
      description={state.description}
      onChange={state.setDescription}
      onSubmit={() => {
        if (state.description.trim()) {
          onGenerate(state.description);
        }
      }}
    />
  );
};

export default AgentCreation;
