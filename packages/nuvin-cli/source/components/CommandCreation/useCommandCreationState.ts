import { useState, useCallback } from 'react';
import type { CommandSource, CustomCommandTemplate } from '@nuvin/nuvin-core';
import { sanitizeCommandId } from '@nuvin/nuvin-core';

type EditingField = 'name' | 'description' | 'scope' | 'prompt';

const FIELD_ORDER: EditingField[] = ['name', 'description', 'scope', 'prompt'];

export interface UseCommandCreationStateOptions {
  mode: 'create' | 'edit';
  initialCommand?: Partial<CustomCommandTemplate>;
  availableScopes: CommandSource[];
}

export interface CommandCreationState {
  activeField: EditingField;
  editedName: string;
  editedDescription: string;
  editedScope: CommandSource;
  editedPrompt: string;
  error?: string;
}

export interface CommandCreationActions {
  setActiveField: (field: EditingField) => void;
  setEditedName: (value: string) => void;
  setEditedDescription: (value: string) => void;
  setEditedScope: (scope: CommandSource) => void;
  setEditedPrompt: (value: string) => void;
  setError: (error?: string) => void;
  handleFieldChange: (field: EditingField, value: string) => void;
  handleFieldSubmit: (field: EditingField) => void;
  handleScopeChange: (direction: 'left' | 'right') => void;
  validate: () => boolean;
  getCommand: () => CustomCommandTemplate;
  nextField: () => void;
  prevField: () => void;
}

export const useCommandCreationState = (
  options: UseCommandCreationStateOptions
): CommandCreationState & CommandCreationActions => {
  const { initialCommand, availableScopes } = options;

  const [activeField, setActiveField] = useState<EditingField>('name');
  const [editedName, setEditedName] = useState(initialCommand?.id || '');
  const [editedDescription, setEditedDescription] = useState(initialCommand?.description || '');
  const [editedScope, setEditedScope] = useState<CommandSource>(
    initialCommand?.source || (availableScopes.includes('local') ? 'local' : availableScopes[0] || 'global')
  );
  const [editedPrompt, setEditedPrompt] = useState(initialCommand?.prompt || '{{user_prompt}}');
  const [error, setError] = useState<string | undefined>();

  const handleFieldChange = useCallback((field: EditingField, value: string) => {
    setError(undefined);
    switch (field) {
      case 'name':
        setEditedName(value);
        break;
      case 'description':
        setEditedDescription(value);
        break;
      case 'prompt':
        setEditedPrompt(value);
        break;
    }
  }, []);

  const nextField = useCallback(() => {
    const currentIndex = FIELD_ORDER.indexOf(activeField);
    const nextIndex = (currentIndex + 1) % FIELD_ORDER.length;
    const nextFieldValue = FIELD_ORDER[nextIndex];
    if (nextFieldValue) setActiveField(nextFieldValue);
  }, [activeField]);

  const prevField = useCallback(() => {
    const currentIndex = FIELD_ORDER.indexOf(activeField);
    const prevIndex = (currentIndex - 1 + FIELD_ORDER.length) % FIELD_ORDER.length;
    const prevFieldValue = FIELD_ORDER[prevIndex];
    if (prevFieldValue) setActiveField(prevFieldValue);
  }, [activeField]);

  const handleFieldSubmit = useCallback((_field: EditingField) => {
    nextField();
  }, [nextField]);

  const handleScopeChange = useCallback((direction: 'left' | 'right') => {
    const currentIndex = availableScopes.indexOf(editedScope);
    let newIndex: number;
    
    if (direction === 'left') {
      newIndex = (currentIndex - 1 + availableScopes.length) % availableScopes.length;
    } else {
      newIndex = (currentIndex + 1) % availableScopes.length;
    }
    
    const newScope = availableScopes[newIndex];
    if (newScope) setEditedScope(newScope);
  }, [editedScope, availableScopes]);

  const validate = useCallback((): boolean => {
    if (!editedName.trim()) {
      setError('Command name is required');
      setActiveField('name');
      return false;
    }

    const sanitized = sanitizeCommandId(editedName);
    if (!sanitized) {
      setError('Invalid command name. Use lowercase letters, numbers, and hyphens.');
      setActiveField('name');
      return false;
    }

    if (!editedDescription.trim()) {
      setError('Description is required');
      setActiveField('description');
      return false;
    }

    if (!editedPrompt.trim()) {
      setError('Prompt template is required');
      setActiveField('prompt');
      return false;
    }

    return true;
  }, [editedName, editedDescription, editedPrompt]);

  const getCommand = useCallback((): CustomCommandTemplate => {
    return {
      id: sanitizeCommandId(editedName),
      description: editedDescription.trim(),
      prompt: editedPrompt,
      source: editedScope,
      enabled: true,
    };
  }, [editedName, editedDescription, editedPrompt, editedScope]);

  return {
    activeField,
    editedName,
    editedDescription,
    editedScope,
    editedPrompt,
    error,
    setActiveField,
    setEditedName,
    setEditedDescription,
    setEditedScope,
    setEditedPrompt,
    setError,
    handleFieldChange,
    handleFieldSubmit,
    handleScopeChange,
    validate,
    getCommand,
    nextField,
    prevField,
  };
};
