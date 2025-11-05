import type { AgentCommandRunner } from './types.js';
import type { AgentConfig, LLMPort, ToolPort } from '../ports.js';
import type { ToolExecutionContext } from '../tools/types.js';
import { AgentManager } from '../agent-manager.js';

export class AgentManagerCommandRunner implements AgentCommandRunner {
  constructor(
    private readonly delegatingConfig: AgentConfig,
    private readonly delegatingLLM: LLMPort,
    private readonly delegatingTools: ToolPort,
  ) {}

  async run(config: Parameters<AgentManager['executeTask']>[0], context?: ToolExecutionContext) {
    const eventPort = context?.eventPort;
    const signal = context?.signal;
    const agentManager = new AgentManager(
      this.delegatingConfig,
      this.delegatingLLM,
      this.delegatingTools,
      eventPort ? (event) => eventPort.emit(event) : undefined,
    );
    return agentManager.executeTask(config, signal);
  }
}
