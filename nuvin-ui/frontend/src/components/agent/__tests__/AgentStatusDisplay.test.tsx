import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AgentStatusDisplay } from '../AgentStatusDisplay';
import { useAgentStore } from '@/store/useAgentStore';
import { useConversationStore } from '@/store';
import { AgentManager } from '@/lib/agent-manager';
import type { AgentSettings } from '@/types';

// Mock the stores
vi.mock('@/store/useAgentStore');
vi.mock('@/store');
vi.mock('@/lib/agent-manager');

const mockUseAgentStore = vi.mocked(useAgentStore);
const mockUseConversationStore = vi.mocked(useConversationStore);
const mockAgentManager = vi.mocked(AgentManager);

describe('AgentStatusDisplay', () => {
  const mockAgent: AgentSettings = {
    id: 'test-agent-1',
    name: 'Test Agent',
    agentType: 'local',
    persona: 'helpful',
    responseLength: 'medium',
    systemPrompt: 'Test prompt',
    temperature: 0.7,
    topP: 1.0,
    maxTokens: 1000,
  };

  const mockAgentStatus = {
    id: 'test-agent-1',
    name: 'Test Agent',
    type: 'local' as const,
    status: 'available' as const,
    totalTokensUsed: 1500,
    totalCost: 0.045,
    messagesProcessed: 5,
    averageResponseTime: 2500,
  };

  const mockConversationMetrics = {
    totalTokens: 500,
    totalCost: 0.015,
    messageCount: 2,
  };

  const mockAgentManagerInstance = {
    getAgentStatus: vi.fn(),
    getConversationMetrics: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockAgentManager.getInstance.mockReturnValue(
      mockAgentManagerInstance as any,
    );

    mockUseAgentStore.mockReturnValue({
      agents: [mockAgent],
      activeAgentId: 'test-agent-1',
      setActiveAgent: vi.fn(),
      addAgent: vi.fn(),
      updateAgent: vi.fn(),
      deleteAgent: vi.fn(),
      reset: vi.fn(),
    });

    mockUseConversationStore.mockReturnValue({
      activeConversationId: 'test-conversation-1',
      conversations: [],
      messages: {},
      addConversation: vi.fn(),
      updateConversation: vi.fn(),
      deleteConversation: vi.fn(),
      setActiveConversation: vi.fn(),
      addMessage: vi.fn(),
      updateMessage: vi.fn(),
      deleteMessage: vi.fn(),
      clearMessages: vi.fn(),
      getActiveConversation: vi.fn(),
      getActiveMessages: vi.fn(),
      getConversationMessages: vi.fn(),
      reset: vi.fn(),
      _syncActiveState: vi.fn(),
    });
  });

  it('renders "No agent selected" when no active agent', () => {
    mockUseAgentStore.mockReturnValue({
      agents: [],
      activeAgentId: null,
      setActiveAgent: vi.fn(),
      addAgent: vi.fn(),
      updateAgent: vi.fn(),
      deleteAgent: vi.fn(),
      reset: vi.fn(),
    });

    render(<AgentStatusDisplay />);

    expect(screen.getByText('Agent Status')).toBeInTheDocument();
    expect(screen.getByText('No agent selected')).toBeInTheDocument();
  });

  it('displays agent information and session metrics', () => {
    mockAgentManagerInstance.getAgentStatus.mockReturnValue(mockAgentStatus);
    mockAgentManagerInstance.getConversationMetrics.mockReturnValue(
      mockConversationMetrics,
    );

    render(<AgentStatusDisplay />);

    // Check agent name and type
    expect(screen.getByText('Test Agent')).toBeInTheDocument();
    expect(screen.getByText('local')).toBeInTheDocument();

    // Check session metrics
    expect(screen.getByText('Session Total')).toBeInTheDocument();
    expect(screen.getByText('1.5K')).toBeInTheDocument(); // formatted tokens
    expect(screen.getByText('$0.05')).toBeInTheDocument(); // formatted cost - using actual formatCost output
    expect(screen.getByText('5')).toBeInTheDocument(); // messages processed
    expect(screen.getByText('2.5s')).toBeInTheDocument(); // formatted response time
  });

  it('displays conversation metrics when active conversation exists', () => {
    mockAgentManagerInstance.getAgentStatus.mockReturnValue(mockAgentStatus);
    mockAgentManagerInstance.getConversationMetrics.mockReturnValue(
      mockConversationMetrics,
    );

    render(<AgentStatusDisplay />);

    expect(screen.getByText('This Conversation')).toBeInTheDocument();
    expect(screen.getByText('500')).toBeInTheDocument(); // conversation tokens
    expect(screen.getByText('$0.02')).toBeInTheDocument(); // conversation cost - using actual formatCost output
    expect(screen.getByText('2')).toBeInTheDocument(); // conversation message count
  });

  it('does not display conversation metrics when no active conversation', () => {
    mockUseConversationStore.mockReturnValue({
      activeConversationId: null,
      conversations: [],
      messages: {},
      addConversation: vi.fn(),
      updateConversation: vi.fn(),
      deleteConversation: vi.fn(),
      setActiveConversation: vi.fn(),
      addMessage: vi.fn(),
      updateMessage: vi.fn(),
      deleteMessage: vi.fn(),
      clearMessages: vi.fn(),
      getActiveConversation: vi.fn(),
      getActiveMessages: vi.fn(),
      getConversationMessages: vi.fn(),
      reset: vi.fn(),
      _syncActiveState: vi.fn(),
    });

    mockAgentManagerInstance.getAgentStatus.mockReturnValue(mockAgentStatus);

    render(<AgentStatusDisplay />);

    expect(screen.queryByText('This Conversation')).not.toBeInTheDocument();
  });

  it('formats large numbers correctly', () => {
    const largeNumberStatus = {
      ...mockAgentStatus,
      totalTokensUsed: 1500000, // 1.5M
      messagesProcessed: 25000, // 25K
    };

    mockAgentManagerInstance.getAgentStatus.mockReturnValue(largeNumberStatus);
    mockAgentManagerInstance.getConversationMetrics.mockReturnValue(
      mockConversationMetrics,
    );

    render(<AgentStatusDisplay />);

    expect(screen.getByText('1.5M')).toBeInTheDocument(); // 1.5 million tokens
    expect(screen.getByText('25.0K')).toBeInTheDocument(); // 25 thousand messages
  });

  it('handles zero values gracefully', () => {
    const zeroStatus = {
      ...mockAgentStatus,
      totalTokensUsed: 0,
      totalCost: 0,
      messagesProcessed: 0,
      averageResponseTime: 0,
    };

    mockAgentManagerInstance.getAgentStatus.mockReturnValue(zeroStatus);
    mockAgentManagerInstance.getConversationMetrics.mockReturnValue({
      totalTokens: 0,
      totalCost: 0,
      messageCount: 0,
    });

    render(<AgentStatusDisplay />);

    expect(screen.getAllByText('0')).toHaveLength(4); // 4 zero values displayed
    expect(screen.getByText('$0.00')).toBeInTheDocument();
    expect(screen.getByText('0ms')).toBeInTheDocument();
  });

  it('displays correct status colors', () => {
    const availableStatus = {
      ...mockAgentStatus,
      status: 'available' as const,
    };
    mockAgentManagerInstance.getAgentStatus.mockReturnValue(availableStatus);

    const { rerender } = render(<AgentStatusDisplay />);

    let statusIndicator = document.querySelector('.bg-green-500');
    expect(statusIndicator).not.toBeNull();

    // Test busy status
    const busyStatus = { ...mockAgentStatus, status: 'busy' as const };
    mockAgentManagerInstance.getAgentStatus.mockReturnValue(busyStatus);

    rerender(<AgentStatusDisplay />);
    statusIndicator = document.querySelector('.bg-yellow-500');
    expect(statusIndicator).not.toBeNull();

    // Test error status
    const errorStatus = { ...mockAgentStatus, status: 'error' as const };
    mockAgentManagerInstance.getAgentStatus.mockReturnValue(errorStatus);

    rerender(<AgentStatusDisplay />);
    statusIndicator = document.querySelector('.bg-red-500');
    expect(statusIndicator).not.toBeNull();

    // Test offline status
    const offlineStatus = { ...mockAgentStatus, status: 'offline' as const };
    mockAgentManagerInstance.getAgentStatus.mockReturnValue(offlineStatus);

    rerender(<AgentStatusDisplay />);
    statusIndicator = document.querySelector('.bg-gray-500');
    expect(statusIndicator).not.toBeNull();
  });

  it('formats response times correctly', () => {
    const timeTestCases = [
      { time: 500, expected: '500ms' },
      { time: 1500, expected: '1.5s' },
      { time: 10000, expected: '10.0s' },
    ];

    timeTestCases.forEach(({ time, expected }) => {
      const timeStatus = { ...mockAgentStatus, averageResponseTime: time };
      mockAgentManagerInstance.getAgentStatus.mockReturnValue(timeStatus);

      const { rerender } = render(<AgentStatusDisplay />);
      expect(screen.getByText(expected)).toBeInTheDocument();
      rerender(<div />); // Clear for next test
    });
  });

  it('calls AgentManager methods with correct parameters', () => {
    mockAgentManagerInstance.getAgentStatus.mockReturnValue(mockAgentStatus);
    mockAgentManagerInstance.getConversationMetrics.mockReturnValue(
      mockConversationMetrics,
    );

    render(<AgentStatusDisplay />);

    expect(mockAgentManagerInstance.getAgentStatus).toHaveBeenCalledWith(
      mockAgent,
    );
    expect(
      mockAgentManagerInstance.getConversationMetrics,
    ).toHaveBeenCalledWith('test-conversation-1');
  });

  it('applies custom className', () => {
    mockAgentManagerInstance.getAgentStatus.mockReturnValue(mockAgentStatus);

    const { container } = render(
      <AgentStatusDisplay className="custom-class" />,
    );

    const card = container.querySelector('.custom-class');
    expect(card).toBeInTheDocument();
  });
});
