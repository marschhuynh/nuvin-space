import { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from '@/components/SelectInput/index.js';
import { AppModal } from '@/components/AppModal.js';
import TextInput from '@/components/TextInput/index.js';
import { ComboBox } from '@/components/ComboBox/index.js';
import type { CommandRegistry, CommandComponentProps } from '@/modules/commands/types.js';

import { PROVIDER_MODELS, type ProviderKey } from '@/const.js';
import { buildProviderOptions, getProviderLabel } from '@/config/providers.js';
import { useTheme } from '@/contexts/ThemeContext.js';
import { useModelsCommandState } from './hooks/useModelsCommandState.js';

const providerOptions = buildProviderOptions();

type AuthNavigationPromptProps = {
  onNavigate: () => void;
  onCancel: () => void;
};

const AuthNavigationPrompt = ({ onNavigate, onCancel }: AuthNavigationPromptProps) => {
  const [selectedAction, setSelectedAction] = useState(0); // 0=Yes, 1=No
  const { theme } = useTheme();

  useInput((input, key) => {
    if (key.tab || key.leftArrow || key.rightArrow) {
      setSelectedAction((prev) => (prev === 0 ? 1 : 0));
      return;
    }

    if (key.return) {
      if (selectedAction === 0) {
        onNavigate();
      } else {
        onCancel();
      }
      return;
    }

    if (input === '1' || input.toLowerCase() === 'y') {
      onNavigate();
      return;
    }

    if (input === '2' || input.toLowerCase() === 'n') {
      onCancel();
      return;
    }
  });

  return (
    <Box flexDirection="column">
      <Text color={theme.model.subtitle} dimColor>
        Would you like to configure authentication now?
      </Text>
      <Box marginTop={1} flexDirection="row" gap={2}>
        <Box alignItems="center">
          <Text color={selectedAction === 0 ? theme.toolApproval?.actionSelected || 'cyan' : 'transparent'} bold>
            {selectedAction === 0 ? '❯ ' : '  '}
          </Text>
          <Text
            dimColor={selectedAction !== 0}
            color={selectedAction === 0 ? theme.toolApproval?.actionApprove || 'green' : 'white'}
            bold
          >
            Yes
          </Text>
        </Box>
        <Box alignItems="center">
          <Text color={selectedAction === 1 ? theme.toolApproval?.actionSelected || 'cyan' : 'transparent'} bold>
            {selectedAction === 1 ? '❯ ' : '  '}
          </Text>
          <Text
            dimColor={selectedAction !== 1}
            color={
              selectedAction === 1
                ? theme.toolApproval?.actionSelected || 'cyan'
                : theme.toolApproval?.actionDeny || 'red'
            }
            bold
          >
            No
          </Text>
        </Box>
      </Box>
      <Box marginTop={1}>
        <Text color={theme.model.help || theme.colors?.muted} dimColor>
          Tab/←→ Navigate • Enter Select • 1/2 or Y/N Quick Select
        </Text>
      </Box>
    </Box>
  );
};

const ModelsCommandComponent = ({ context, deactivate, isActive }: CommandComponentProps) => {
  const { theme } = useTheme();

  const llmFactory = context.orchestratorManager?.getLLMFactory();

  const {
    state,
    selectProvider,
    selectModel,
    goToCustomInput,
    goBack,
    setCustomModelInput,
    submitCustomModel,
    clearError,
    navigateToAuth,
  } = useModelsCommandState(context.config, llmFactory, deactivate, deactivate, context);

  useInput(
    (_input, key) => {
      if (key.escape && !state.showAuthPrompt) {
        goBack();
      }
    },
    { isActive: isActive && !state.showAuthPrompt },
  );

  const handleProviderSelect = async (item: { label: string; value: string }) => {
    const provider = item.value as ProviderKey;
    selectProvider(provider);
  };

  const handleModelSelect = async (item: { label: string; value: string }) => {
    if (item.value === 'custom') {
      goToCustomInput();
      return;
    }
    await selectModel(item.value);
  };

  const handleCustomModelSubmit = async (value: string) => {
    await submitCustomModel(value);
  };

  if (state.stage === 'provider') {
    return (
      <AppModal
        visible={true}
        title="Select AI Provider"
        titleColor={theme.model.title}
        type="info"
        onClose={deactivate}
        closeOnEscape={false}
        closeOnEnter={false}
      >
        <Text color={theme.model.subtitle} dimColor>
          Choose the AI provider for your models
        </Text>
        <Box marginTop={1}>
          <SelectInput items={providerOptions} onSelect={handleProviderSelect} />
        </Box>
      </AppModal>
    );
  }

  if (state.stage === 'loading') {
    return (
      <AppModal
        visible={true}
        title="Loading Models..."
        titleColor={theme.model.title}
        type="info"
        onClose={deactivate}
        closeOnEscape={false}
        closeOnEnter={false}
      >
        <Text color={theme.model.subtitle} dimColor>
          Fetching available models from{' '}
          {state.selectedProvider ? getProviderLabel(state.selectedProvider) : 'selected provider'}...
        </Text>
      </AppModal>
    );
  }

  if (state.stage === 'model' && state.selectedProvider) {
    const fallbackModels = PROVIDER_MODELS[state.selectedProvider] || [];
    const models = state.availableModels.length > 0 ? state.availableModels : fallbackModels;
    const modelOptions = models.map((model) => ({ label: model, value: model }));

    const shouldUseAutocomplete = state.availableModels.length > 10;
    const hasAuthError = state.showAuthPrompt;

    return (
      <AppModal
        visible={true}
        title={`Select Model for ${state.selectedProvider ? getProviderLabel(state.selectedProvider) : 'Unknown Provider'}`}
        titleColor={theme.model.title}
        type="info"
        onClose={deactivate}
        closeOnEscape={false}
        closeOnEnter={false}
      >
        {state.error && (
          <Box marginBottom={1} flexDirection="column">
            <Text color="red">{state.error}</Text>
          </Box>
        )}

        {!hasAuthError && (
          <Text color={theme.model.subtitle} dimColor>
            {state.availableModels.length > 0
              ? `${models.length} models available`
              : 'Choose a model or enter a custom model name'}
          </Text>
        )}

        <Box marginTop={1}>
          {hasAuthError ? (
            <AuthNavigationPrompt onNavigate={navigateToAuth} onCancel={clearError} />
          ) : shouldUseAutocomplete ? (
            <ComboBox
              items={modelOptions}
              placeholder="Type to search models..."
              maxDisplayItems={10}
              enableRotation={true}
              onSelect={(item) => handleModelSelect({ label: item.label, value: item.value })}
              onCancel={goBack}
            />
          ) : (
            <SelectInput
              items={[
                ...modelOptions.map((m) => ({ label: m.label, value: m.value })),
                { label: '🎯 Enter custom model name...', value: 'custom' },
              ]}
              onSelect={(item) => handleModelSelect({ label: item.label, value: item.value })}
            />
          )}
        </Box>
      </AppModal>
    );
  }

  if (state.stage === 'custom') {
    return (
      <AppModal
        visible={true}
        title="Enter Custom Model Name"
        titleColor={theme.model.title}
        type="info"
        onClose={deactivate}
        closeOnEscape={false}
        closeOnEnter={false}
      >
        <Text color={theme.model.subtitle} dimColor>
          Type the exact model name for{' '}
          {state.selectedProvider ? getProviderLabel(state.selectedProvider) : 'selected provider'}
        </Text>
        <Box marginTop={1}>
          <Text color={theme.model.label}>Model: </Text>
          <TextInput
            value={state.customModel}
            onChange={setCustomModelInput}
            onSubmit={handleCustomModelSubmit}
            placeholder="e.g., anthropic/claude-3-opus-20240229"
          />
        </Box>
        <Box marginTop={1}>
          <Text color={theme.model.help} dimColor>
            Press Enter to save, Esc to cancel
          </Text>
        </Box>
      </AppModal>
    );
  }

  return null;
};

export function registerModelsCommand(registry: CommandRegistry) {
  registry.register({
    id: '/model',
    type: 'component',
    description: 'Select AI provider and model configuration.',
    category: 'config',
    component: ModelsCommandComponent,
  });
}
