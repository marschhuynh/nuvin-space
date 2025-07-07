/**
 * A2A (Agent-to-Agent) service using the official @a2a-js/sdk
 * Imports only client components to avoid server-side dependencies in browser builds
 */

// Import only the client and types, avoiding server components
import { A2AClient } from '@a2a-js/sdk/build/src/client/client.js';
import type {
  AgentCard,
  MessageSendParams,
  Message,
  SendMessageResponse,
  JSONRPCResponse
} from '@a2a-js/sdk/build/src/types.js';

/**
 * Service for managing A2A (Agent-to-Agent) communication
 * Uses the official @a2a-js/sdk client
 */
export class A2AService {
  private static instance: A2AService;
  private clients: Map<string, A2AClient> = new Map();

  private constructor() {}

  static getInstance(): A2AService {
    if (!A2AService.instance) {
      A2AService.instance = new A2AService();
    }
    return A2AService.instance;
  }

  /**
   * Create or get an A2A client for a specific agent URL
   */
  getClient(agentBaseUrl: string): A2AClient {
    if (!this.clients.has(agentBaseUrl)) {
      const client = new A2AClient(agentBaseUrl.replace(/\/$/, ''));
      this.clients.set(agentBaseUrl, client);
    }
    return this.clients.get(agentBaseUrl)!;
  }

  /**
   * Discover an agent's capabilities by fetching its agent card
   */
  async discoverAgent(agentBaseUrl: string): Promise<AgentCard> {
    const client = this.getClient(agentBaseUrl);
    return await client.getAgentCard();
  }

  /**
   * Test connectivity to an A2A agent
   */
  async testConnection(agentBaseUrl: string): Promise<boolean> {
    try {
      const client = this.getClient(agentBaseUrl);

      // Test by fetching the agent card
      await client.getAgentCard();

      return true;
    } catch (error) {
      console.error('A2A connection test failed:', error);
      return false;
    }
  }

  /**
   * Send a message to an A2A agent
   */
  async sendMessage(agentBaseUrl: string, messageContent: string, options?: {
    contextId?: string;
    taskId?: string;
    blocking?: boolean;
    acceptedOutputModes?: string[];
  }): Promise<SendMessageResponse> {
    const client = this.getClient(agentBaseUrl);

    // Create a proper Message object according to the SDK
    const message: Message = {
      kind: 'message',
      messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      role: 'user',
      parts: [
        {
          kind: 'text',
          text: messageContent
        }
      ],
      contextId: options?.contextId,
      referenceTaskIds: options?.taskId ? [options.taskId] : undefined
    };

    const params: MessageSendParams = {
      message,
      configuration: {
        acceptedOutputModes: options?.acceptedOutputModes || ['text'],
        blocking: options?.blocking ?? true
      }
    };

    return await client.sendMessage(params);
  }

  /**
   * Get agent capabilities
   */
  async getCapabilities(agentBaseUrl: string): Promise<string[]> {
    try {
      const agentCard = await this.discoverAgent(agentBaseUrl);
      return agentCard.capabilities ? Object.keys(agentCard.capabilities) : [];
    } catch (error) {
      console.error('Failed to get agent capabilities:', error);
      return [];
    }
  }

  /**
   * Get agent description and basic info
   */
  async getAgentInfo(agentBaseUrl: string): Promise<{
    name: string;
    description: string;
    capabilities: string[];
  } | null> {
    try {
      const agentCard = await this.discoverAgent(agentBaseUrl);
      return {
        name: agentCard.name,
        description: agentCard.description,
        capabilities: agentCard.capabilities ? Object.keys(agentCard.capabilities) : []
      };
    } catch (error) {
      console.error('Failed to get agent info:', error);
      return null;
    }
  }

  /**
   * Remove a client from the cache
   */
  removeClient(agentBaseUrl: string): void {
    this.clients.delete(agentBaseUrl);
  }

  /**
   * Clear all cached clients
   */
  clearClients(): void {
    this.clients.clear();
  }
}

// Export singleton instance
export const a2aService = A2AService.getInstance();

// Re-export types for convenience
export type {
  AgentCard,
  MessageSendParams,
  Message,
  SendMessageResponse,
  JSONRPCResponse
};