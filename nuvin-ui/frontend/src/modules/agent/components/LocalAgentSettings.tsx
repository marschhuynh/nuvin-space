import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';

interface LocalAgentSettingsProps {
  persona: 'helpful' | 'professional' | 'creative' | 'analytical' | 'casual';
  responseLength: 'short' | 'medium' | 'long';
  temperature: number;
  topP: number;
  maxTokens: number;
  isEditing: boolean;
  onPersonaChange: (
    persona: 'helpful' | 'professional' | 'creative' | 'analytical' | 'casual',
  ) => void;
  onResponseLengthChange: (length: 'short' | 'medium' | 'long') => void;
  onTemperatureChange: (temp: number) => void;
  onTopPChange: (topP: number) => void;
  onMaxTokensChange: (tokens: number) => void;
}

export function LocalAgentSettings({
  persona,
  responseLength,
  temperature,
  topP,
  maxTokens,
  isEditing,
  onPersonaChange,
  onResponseLengthChange,
  onTemperatureChange,
  onMaxTokensChange,
}: LocalAgentSettingsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Left Column */}
      <div className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="persona">Persona</Label>
          {isEditing ? (
            <Select value={persona} onValueChange={onPersonaChange}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select persona" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="helpful">Helpful Assistant</SelectItem>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="creative">Creative</SelectItem>
                <SelectItem value="analytical">Analytical</SelectItem>
                <SelectItem value="casual">Casual</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <div className="px-3 py-2 border rounded-md bg-background text-sm capitalize select-all h-9 flex items-center">
              {persona === 'helpful' ? 'Helpful Assistant' : persona}
            </div>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="responseLength">Response Length</Label>
          {isEditing ? (
            <Select
              value={responseLength}
              onValueChange={onResponseLengthChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select response length" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="short">Short</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="long">Long</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <div className="px-3 py-2 border rounded-md bg-background text-sm capitalize select-all h-9 flex items-center">
              {responseLength}
            </div>
          )}
        </div>
      </div>

      {/* Right Column */}
      <div className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="temperature">Temperature: {temperature}</Label>
          <Slider
            value={[temperature]}
            onValueChange={(value) => onTemperatureChange(value[0])}
            max={2}
            min={0}
            step={0.1}
            className="w-full"
            disabled={!isEditing}
          />
          <div className="flex justify-between text-xs text-muted-foreground h-5.5">
            <span>Focused (0)</span>
            <span>Creative (2)</span>
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="maxTokens">Max Tokens</Label>
          {isEditing ? (
            <Input
              id="maxTokens"
              type="number"
              min="100"
              max="8192"
              value={maxTokens}
              onChange={(e) =>
                onMaxTokensChange(parseInt(e.target.value) || 2048)
              }
            />
          ) : (
            <div className="px-3 py-2 border rounded-md bg-background text-sm select-all h-9 flex items-center">
              {maxTokens.toLocaleString()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
