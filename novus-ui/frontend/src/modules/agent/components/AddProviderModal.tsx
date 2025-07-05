import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useProviderStore } from '@/store/useProviderStore';

const PROVIDER_OPTIONS = ['OpenAI', 'Anthropic', 'Cohere', 'Azure'];

interface AddProviderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddProviderModal({ open, onOpenChange }: AddProviderModalProps) {
  const { addProvider } = useProviderStore();
  const [newProviderName, setNewProviderName] = useState('');
  const [newProviderKey, setNewProviderKey] = useState('');

  const handleSubmit = () => {
    if (!newProviderName) return;
    addProvider({ id: Date.now().toString(), name: newProviderName, apiKey: newProviderKey });
    setNewProviderName('');
    setNewProviderKey('');
    onOpenChange(false);
  };

  const handleCancel = () => {
    setNewProviderName('');
    setNewProviderKey('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Provider</DialogTitle>
          <DialogDescription>
            Add a new AI provider to your configuration.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="provider">Provider</Label>
            <Select
              value={newProviderName}
              onValueChange={setNewProviderName}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                {PROVIDER_OPTIONS.map(name => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="apiKey">API Key</Label>
            <Input
              id="apiKey"
              type="password"
              value={newProviderKey}
              onChange={e => setNewProviderKey(e.target.value)}
              placeholder="Enter API key"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!newProviderName}>
            Add Provider
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}