import type { AgentCatalog, AgentCommandRunner, DelegationService } from './types.js';
import { DefaultDelegationService } from './DefaultDelegationService.js';
import { DefaultDelegationPolicy } from './DefaultDelegationPolicy.js';
import { DefaultSpecialistAgentFactory } from './DefaultSpecialistAgentFactory.js';
import { DefaultDelegationResultFormatter } from './DefaultDelegationResultFormatter.js';

export interface DelegationServiceConfig {
  agentRegistry: AgentCatalog;
  commandRunner: AgentCommandRunner;
  agentListProvider?: () => Array<{ id: string; name: string; description: string }>;
}

export class DelegationServiceFactory {
  create(config: DelegationServiceConfig): DelegationService {
    const specialistFactory = new DefaultSpecialistAgentFactory({
      agentListProvider: config.agentListProvider,
    });

    return new DefaultDelegationService(
      config.agentRegistry,
      new DefaultDelegationPolicy(),
      specialistFactory,
      config.commandRunner,
      new DefaultDelegationResultFormatter(),
    );
  }
}
