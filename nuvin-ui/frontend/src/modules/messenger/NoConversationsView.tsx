import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Button } from '@/components';
import { useAgentManager } from '@/hooks';
import { useProviderStore } from '@/store/useProviderStore';

export const NoConversationsView = ({ newConversation }: { newConversation: () => void }) => {
  const navigate = useNavigate();
  const { providers } = useProviderStore();
  const { activeAgent, activeProvider, isReady } = useAgentManager();
  // Check setup status
  const hasProviders = providers.length > 0;
  const hasValidProvider = activeProvider?.apiKey && activeProvider?.activeModel;
  const hasSelectedAgent = activeAgent;

  // Determine setup step
  const getSetupStep = () => {
    if (!hasProviders) return 1;
    if (!hasValidProvider) return 2;
    if (!hasSelectedAgent) return 3;
    return 4;
  };

  const currentStep = getSetupStep();

  return (
    <div
      className="flex-1 flex flex-col items-center p-8 text-center"
      style={{ justifyContent: 'center', transform: 'translateY(-20%)' }}
    >
      <div className="max-w-2xl mx-auto flex flex-col items-center" style={{ gap: '2rem' }}>
        {/* Welcome Header */}
        <div className="flex flex-col items-center text-primary-background" style={{ gap: '1rem' }}>
          <div className="mt-20 flex flex-col" style={{ gap: '0.5rem' }}>
            <h3
              className="font-semibold "
              style={{
                fontSize: '1.75rem',
                lineHeight: '2.25rem',
              }}
            >
              Welcome to Nuvin Space
            </h3>
            <p className="text-gray-600" style={{ fontSize: '1.125rem' }}>
              Your AI agent management hub
            </p>
          </div>
        </div>

        {/* Setup Steps */}
        <div className="w-full max-w-lg">
          <div className="text-primary-background p-6">
            <h4 className="font-medium mb-4 text-left">Let's get you set up in 3 simple steps:</h4>

            <div className="space-y-4">
              {/* Step 1: Add Provider */}
              <div
                className={`flex items-start gap-3 p-3 rounded-lg transition-all bg-background ${
                  currentStep === 1 ? 'bg-blue-50 border border-blue-200' : 'bg-background'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium ${
                    currentStep > 1
                      ? 'bg-green-500 text-white'
                      : currentStep === 1
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-300 text-gray-600'
                  }`}
                >
                  {currentStep > 1 ? '✓' : '1'}
                </div>
                <div className="flex-1 text-left text-primary-background">
                  <p className="font-medium">Add an AI Provider</p>
                  <p className="text-sm text-gray-400 mt-1">Configure OpenAI, Anthropic, or another AI service</p>
                  {currentStep === 1 && (
                    <Button
                      onClick={() => navigate('/settings?tab=providers')}
                      className="mt-2 h-8 px-3 text-sm"
                      size="sm"
                    >
                      Add Provider
                    </Button>
                  )}
                </div>
              </div>

              {/* Step 2: Configure Provider */}
              <div
                className={`flex items-start gap-3 p-3 rounded-lg transition-all ${
                  currentStep === 2 ? 'bg-blue-50 border border-blue-200' : 'bg-background'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium ${
                    currentStep > 2
                      ? 'bg-green-500 text-white'
                      : currentStep === 2
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-300 text-gray-600'
                  }`}
                >
                  {currentStep > 2 ? '✓' : '2'}
                </div>
                <div className="flex-1 text-left text-primary-background">
                  <p className="font-medium">Set API Key & Model</p>
                  <p className="text-sm text-gray-400 mt-1">Enter your API key and choose a model</p>
                  {currentStep === 2 && (
                    <Button
                      onClick={() => navigate('/settings?tab=providers')}
                      className="mt-2 h-8 px-3 text-sm"
                      size="sm"
                    >
                      Configure Provider
                    </Button>
                  )}
                </div>
              </div>

              {/* Step 3: Select Agent */}
              <div
                className={`flex items-start gap-3 p-3 rounded-lg transition-all ${
                  currentStep === 3 ? 'bg-blue-50 border border-blue-200' : 'bg-background'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium ${
                    currentStep > 3
                      ? 'bg-green-500 text-white'
                      : currentStep === 3
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-300 text-gray-600'
                  }`}
                >
                  {currentStep > 3 ? '✓' : '3'}
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-primary-background">Choose an AI Agent</p>
                  <p className="text-sm text-gray-400 mt-1">Select from pre-configured agents or create your own</p>
                  {currentStep === 3 && hasValidProvider && (
                    <div className="mt-2 text-sm text-blue-600 font-medium">
                      → Use the "Agent Configuration" panel on the right
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex flex-col items-center" style={{ gap: '1rem' }}>
          <Button
            onClick={newConversation}
            className={`flex items-center gap-2 px-6 py-3 transition-all ${
              !isReady ? 'opacity-50' : 'hover:shadow-lg'
            }`}
            disabled={!isReady}
            style={{
              fontSize: '1rem',
              minWidth: '12.944rem',
            }}
          >
            <Plus className="w-4 h-4" />
            {isReady ? 'Start Conversation' : 'Complete Setup First'}
          </Button>
        </div>
      </div>
    </div>
  );
};
