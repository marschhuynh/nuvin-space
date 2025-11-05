import * as os from 'node:os';
import { buildInjectedSystem, renderTemplate } from '../prompt-utils.js';
import type { SpecialistAgentConfig } from '../agent-types.js';
import type { SpecialistAgentFactory, SpecialistAgentFactoryInput } from './types.js';

type SystemContext = {
  timeISO: string;
  platform: NodeJS.Platform;
  arch: string;
  tempDir: string;
  workspaceDir: string;
};

type AgentInfo = {
  id: string;
  name: string;
  description: string;
};

type SystemContextProvider = () => SystemContext;
type AgentListProvider = () => AgentInfo[];

type IdGenerator = (baseId: string) => string;

const defaultSystemContext: SystemContextProvider = () => ({
  timeISO: new Date().toLocaleString(),
  platform: process.platform,
  arch: process.arch,
  tempDir: os.tmpdir?.() ?? '',
  workspaceDir: process.cwd(),
});

const defaultIdGenerator: IdGenerator = (baseId: string) => `${baseId}-${Date.now()}`;

export class DefaultSpecialistAgentFactory implements SpecialistAgentFactory {
  constructor(
    private readonly options?: {
      systemContextProvider?: SystemContextProvider;
      agentListProvider?: AgentListProvider;
      idGenerator?: IdGenerator;
    },
  ) {}

  create(input: SpecialistAgentFactoryInput): SpecialistAgentConfig {
    const template = input.template;
    const params = input.params;
    const context = input.context;

    const systemContext = this.options?.systemContextProvider?.() ?? defaultSystemContext();
    const availableAgents = this.options?.agentListProvider?.() ?? [];

    const injectedSystem = buildInjectedSystem(
      {
        today: systemContext.timeISO,
        platform: systemContext.platform,
        arch: systemContext.arch,
        tempDir: systemContext.tempDir,
        workspaceDir: systemContext.workspaceDir,
        availableAgents,
      },
      { withSubAgent: false },
    );

    const renderedSystemPrompt = renderTemplate(
      `${template.systemPrompt}
<env>
{{injectedSystem}}
</env>`,
      { injectedSystem },
    );

    const idBase = template.id ?? params.agent;
    const agentId = this.options?.idGenerator?.(idBase) ?? defaultIdGenerator(idBase);

    return {
      agentId,
      agentName: template.name ?? params.agent,
      taskDescription: params.task,
      systemPrompt: renderedSystemPrompt,
      tools: template.tools ?? [],
      provider: template.provider,
      model: template.model,
      temperature: template.temperature,
      maxTokens: template.maxTokens,
      topP: template.topP,
      timeoutMs: template.timeoutMs,
      shareContext: template.shareContext ?? false,
      delegatingMemory: undefined, // TODO: provide delegating memory when available
      delegationDepth: input.currentDepth + 1,
      conversationId: context?.conversationId,
      messageId: context?.messageId,
      toolCallId: typeof context?.toolCallId === 'string' ? context.toolCallId : undefined,
    } satisfies SpecialistAgentConfig;
  }
}
