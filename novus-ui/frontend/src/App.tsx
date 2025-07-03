import { useState, useRef } from 'react';
import {
  Navbar,
  ConversationHistory,
  MessageList,
  ChatInput,
  AgentConfiguration
} from '@/components';
import { Message, Conversation, AgentConfig, Agent } from '@/types';

import './App.css';

// Default agents data
const DEFAULT_AGENTS: Agent[] = [
  {
    id: 'general-assistant',
    name: 'General Assistant',
    description: 'A versatile AI assistant capable of helping with various tasks including writing, analysis, and problem-solving.',
    systemPrompt: 'You are a helpful AI assistant. Provide accurate, helpful, and friendly responses to user queries.',
    tools: [
      { name: 'text-analysis', description: 'Analyze and process text content', enabled: true },
      { name: 'web-search', description: 'Search the web for information', enabled: true },
      { name: 'code-generation', description: 'Generate and review code', enabled: true }
    ],
    status: 'active',
    lastUsed: '2 minutes ago'
  },
  {
    id: 'code-specialist',
    name: 'Code Specialist',
    description: 'Expert in software development, code review, debugging, and technical documentation.',
    systemPrompt: 'You are an expert software developer. Focus on providing high-quality code solutions, best practices, and technical guidance.',
    tools: [
      { name: 'code-generation', description: 'Generate and review code', enabled: true },
      { name: 'code-execution', description: 'Execute and test code snippets', enabled: true },
      { name: 'documentation', description: 'Generate technical documentation', enabled: true },
      { name: 'debugging', description: 'Debug and troubleshoot code', enabled: true }
    ],
    status: 'inactive',
    lastUsed: '1 hour ago'
  },
  {
    id: 'research-analyst',
    name: 'Research Analyst',
    description: 'Specialized in research, data analysis, and providing detailed insights on various topics.',
    systemPrompt: 'You are a research analyst. Provide thorough, well-researched responses with citations and evidence-based insights.',
    tools: [
      { name: 'web-search', description: 'Search the web for information', enabled: true },
      { name: 'data-analysis', description: 'Analyze datasets and trends', enabled: true },
      { name: 'fact-checking', description: 'Verify information accuracy', enabled: true },
      { name: 'citation-generation', description: 'Generate proper citations', enabled: true }
    ],
    status: 'inactive',
    lastUsed: 'Yesterday'
  }
];

function App() {
  // State for conversations
  const [conversations, setConversations] = useState<Conversation[]>([
    { id: 1, title: "Getting started with AI", timestamp: "2 hours ago", active: true },
    { id: 2, title: "Code review assistance", timestamp: "Yesterday" },
    { id: 3, title: "Project planning", timestamp: "2 days ago" },
    { id: 4, title: "API documentation help", timestamp: "1 week ago" },
  ]);

  // State for current conversation messages
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, role: 'user', content: 'Hello! Can you help me with my project?' },
    { id: 2, role: 'assistant', content: 'Of course! I\'d be happy to help you with your project. What specific area would you like assistance with?' },
    { id: 3, role: 'user', content: 'I need help with React component architecture.' },
  ]);

  // State for loading status
  const [isLoading, setIsLoading] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // State for agent configuration with default general-assistant
  const [agentConfig, setAgentConfig] = useState<AgentConfig>({
    selectedAgent: 'general-assistant',
    agents: DEFAULT_AGENTS
  });

  // User info
  const [user] = useState({ name: "Marsch Huynh" });

  // Handlers
  const handleSendMessage = async (content: string) => {
    const newMessage: Message = {
      id: messages.length + 1,
      role: 'user',
      content,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, newMessage]);
    setIsLoading(true);

    // Get current agent for context
    const currentAgent = agentConfig.agents.find(agent => agent.id === agentConfig.selectedAgent);
    const agentName = currentAgent?.name || 'AI Assistant';

    // Simulate API call delay with timeout reference for cancellation
    timeoutRef.current = setTimeout(() => {
      const assistantMessage: Message = {
        id: messages.length + 2,
        role: 'assistant',
        content: `Hello! I'm ${agentName}. You asked: "${content}". This is a simulated response. In the actual implementation, this would be connected to your AI agent service using my specialized tools and capabilities.`,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMessage]);
      setIsLoading(false);
      timeoutRef.current = null;
    }, 2000); // Increased delay to better demo the stop functionality
  };

  const handleStopGeneration = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      setIsLoading(false);

      // Add a system message indicating the generation was stopped
      const stopMessage: Message = {
        id: messages.length + 1,
        role: 'assistant',
        content: '⏹️ Generation stopped by user.',
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, stopMessage]);
      console.log('Generation stopped by user');
    }
  };

  const handleNewConversation = () => {
    // Stop any ongoing generation
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      setIsLoading(false);
    }

    const newConversation: Conversation = {
      id: conversations.length + 1,
      title: "New Conversation",
      timestamp: "Just now",
      active: true
    };

    // Mark all conversations as inactive
    const updatedConversations = conversations.map(conv => ({ ...conv, active: false }));
    setConversations([newConversation, ...updatedConversations]);

    // Clear messages for new conversation
    setMessages([]);
  };

  const handleConversationSelect = (conversationId: number) => {
    // Stop any ongoing generation when switching conversations
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      setIsLoading(false);
    }

    const updatedConversations = conversations.map(conv => ({
      ...conv,
      active: conv.id === conversationId
    }));
    setConversations(updatedConversations);

    // In a real app, you would load messages for the selected conversation
    // For demo purposes, we'll keep the current messages
  };

  const handleAgentConfigChange = (config: AgentConfig) => {
    setAgentConfig(config);
    const selectedAgent = config.agents.find(agent => agent.id === config.selectedAgent);
    console.log('Agent config updated:', config);
    console.log('Selected agent:', selectedAgent?.name);
  };

  const handleAgentConfigReset = () => {
    const defaultConfig: AgentConfig = {
      selectedAgent: 'general-assistant',
      agents: DEFAULT_AGENTS
    };
    setAgentConfig(defaultConfig);
    console.log('Agent config reset to defaults - General Assistant selected');
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <Navbar userName={user.name} />

      <div className="flex flex-1 overflow-hidden">
        <ConversationHistory
          conversations={conversations}
          onNewConversation={handleNewConversation}
          onConversationSelect={handleConversationSelect}
        />

        <div className="flex-1 flex flex-col bg-gray-100">
          <MessageList
            messages={messages}
            isLoading={isLoading}
          />

          <ChatInput
            onSendMessage={handleSendMessage}
            onStop={handleStopGeneration}
            disabled={isLoading}
          />
        </div>

        <AgentConfiguration
          config={agentConfig}
          onConfigChange={handleAgentConfigChange}
          onReset={handleAgentConfigReset}
        />
      </div>
    </div>
  );
}

export default App;