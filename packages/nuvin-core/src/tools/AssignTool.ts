import type { ToolDefinition } from '../ports.js';
import { ErrorReason } from '../ports.js';
import type { FunctionTool, ToolExecutionContext, ExecResultError } from './types.js';
import { okText, err } from './result-helpers.js';
import type { AssignParams } from '../agent-types.js';
import type { DelegationService } from '../delegation/types.js';
import type { AssignTaskMetadata } from './tool-result-metadata.js';
import type { DelegationMetadata } from './metadata-types.js';

const DESCRIPTION_TEMPLATE = `Delegate a task to a specialist agent for focused, independent execution.

The assign_task tool launches specialized agents that autonomously handle complex, multi-step tasks. Each agent has specific capabilities and tools available to it.

Available agents:
{AGENT_LIST}

When NOT to use this tool:
- To read a specific file path - use file_read instead (faster)
- To search for a class like "class Foo" - use grep_tool instead (faster)
- To search within 2-3 specific files - use file_read instead (faster)
- For simple, single-step tasks that don't need specialist knowledge

Usage notes:
- Always include a short description (5-10 words) summarizing what the agent will do
- Launch multiple agents concurrently by making mutiple assign_task calls in a single message
- Use resume parameter with a session ID to continue a previous agent session with full context preserved
- Session IDs are returned in metadata.sessionId after each invocation
- When the agent completes, it returns a result to you (not visible to user) - summarize it for the user
- Provide clear, detailed task descriptions so agents can work autonomously
- Clearly specify whether you expect code writing or just research (search, reads, web fetches)
- Agent outputs should generally be trusted

Session resumption:
- Pass session_id from previous invocation to resume parameter
- Agent continues with full conversation history preserved
- Useful for follow-up questions or continuing interrupted work

Examples of when and how to use assign_task:

<example>
User: "I need to create a reusable data table component with sorting, filtering, and pagination."
Assistant: "I'll use the code-investigator agent to analyze existing patterns and design a comprehensive data table component."
call assign_task({ agent: "code-investigator", task: "Analyze codebase for table component patterns and design a reusable data table with sorting, filtering, pagination", description: "Design data table component" })
</example>

<example>
User: "My app is re-rendering too frequently. Can you help optimize it?"
Assistant: "I'll delegate this to the code-investigator agent to trace the rendering behavior and identify optimization opportunities."
call assign_task({ agent: "code-investigator", task: "Trace component render cycles, identify unnecessary re-renders, and suggest memoization strategies", description: "Analyze React render performance" })
</example>

<example>
User: "I just finished writing the login authentication function. Can you take a look?"
Assistant: "I'll use the code-security-auditor agent to review your authentication code for security issues and best practices."
call assign_task({ agent: "code-security-auditor", task: "Review the authentication function for security vulnerabilities, input validation, and secure coding practices", description: "Security review of auth function" })
</example>

<example>
User: "I've finished implementing the payment processing feature."
Assistant: "Let me have the code-security-auditor review this for security vulnerabilities before we proceed."
call assign_task({ agent: "code-security-auditor", task: "Audit payment processing code for security flaws, PCI compliance issues, and error handling", description: "Security audit of payment code" })
</example>

<example>
User: "How does the data flow from API to database in this codebase?"
Assistant: "I'll launch the code-investigator agent to trace the data flow architecture."
call assign_task({ agent: "code-investigator", task: "Trace data flow from API endpoints through service layers to database, document the architecture", description: "Map API to database flow" })
</example>


<example>
User: "Review my new feature - check both the code quality and security."
Assistant: "I'll launch both agents in parallel to review your code."
Assistant: [multiple tool calls in single message]
call assign_task({ agent: "code-investigator", task: "Review code structure, patterns, and best practices in the new feature", description: "Code quality review" })
call assign_task({ agent: "code-security-auditor", task: "Audit the new feature for security vulnerabilities and input validation", description: "Security audit" })
Assistant: Both results return together, then summarize findings to user
</example>

<example>
[Turn 1]
User: "Analyze the authentication implementation"
Assistant: "I'll have the code-investigator review the authentication code."
call assign_task({ agent: "code-investigator", task: "Analyze authentication implementation, check patterns and security", description: "Auth code review" })
Agent returns: { status: "success", result: "...", metadata: { sessionId: "code-investigator:abc123", ... } }
Assistant: [Summarizes findings to user, remembers sessionId from metadata]

[Turn 2 - User follow-up]
User: "Are there any CSRF vulnerabilities in that auth code?"
Assistant: "Let me continue the investigation with the same context."
call assign_task({ agent: "code-investigator", resume: "code-investigator:abc123", task: "Check specifically for CSRF vulnerabilities in the authentication code", description: "CSRF security check" })
Agent continues with full previous context about the auth implementation
</example>`;

export type AssignSuccessResult = {
  status: 'success';
  type: 'text';
  result: string;
  metadata: AssignTaskMetadata;
};

export type AssignErrorResult = ExecResultError & {
  metadata?: {
    agentId?: string;
    errorReason?: ErrorReason;
    delegationDepth?: number;
    policyDenied?: boolean;
    agentNotFound?: boolean;
  };
};

export type AssignResult = AssignSuccessResult | AssignErrorResult;

export class AssignTool implements FunctionTool<AssignParams, ToolExecutionContext, AssignResult> {
  name = 'assign_task';
  parameters = {
    type: 'object',
    properties: {
      description: {
        type: 'string',
        description:
          'A summary of the task to be performed by the delegated agent. Be specific about the desired outcome. From 5-10 words.',
      },
      agent: {
        type: 'string',
        description: 'Agent ID from registry (e.g., "code-reviewer", "researcher")',
      },
      task: {
        type: 'string',
        description: 'Detailed description of the task to be performed by the agent.',
      },
      resume: {
        type: 'string',
        description:
          'Session ID from a previous agent invocation to resume. The agent will continue with its full previous context preserved.',
      },
    },
    required: ['agent', 'task', 'description'],
  } as const;

  constructor(private readonly delegationService: DelegationService) {}

  /**
   * Update the enabled agents configuration
   */
  setEnabledAgents(enabledAgents: Record<string, boolean>): void {
    this.delegationService.setEnabledAgents(enabledAgents);
  }

  /**
   * Generate dynamic description based on current registry
   * Only shows enabled agents
   */
  definition(): ToolDefinition['function'] {
    const enabledAgents = this.delegationService.listEnabledAgents();
    const agentList = enabledAgents
      .map((a) => {
        const toolsStr = a.tools?.length ? ` (Tools: ${this.formatTools(a.tools)})` : '';
        return `- ${a.id}: ${a.description ?? 'No description provided'}${toolsStr}`;
      })
      .join('\n');

    const description = DESCRIPTION_TEMPLATE.replace('{AGENT_LIST}', agentList);

    return {
      name: this.name,
      description,
      parameters: this.parameters,
    };
  }

  private formatTools(tools: string[]): string {
    const toolMap: Record<string, string> = {
      file_read: 'Read',
      file_edit: 'Edit',
      file_new: 'Write',
      grep_tool: 'Grep',
      glob_tool: 'Glob',
      ls_tool: 'LS',
      bash_tool: 'Bash',
      web_search: 'WebSearch',
      web_fetch: 'WebFetch',
      todo_write: 'Todo',
    };

    return (
      tools
        .map((t) => toolMap[t] ?? t)
        .slice(0, 8)
        .join(', ') + (tools.length > 8 ? ', ...' : '')
    );
  }

  /**
   * Delegate a task to a specialist agent for focused execution
   *
   * @param params - Agent ID and task description to delegate
   * @param context - Execution context including delegation depth tracking
   * @returns Delegation result with comprehensive metrics including cost breakdown
   *
   * @example
   * ```typescript
   * const result = await assignTool.execute({
   *   agent: 'code-reviewer',
   *   task: 'Review the changes in src/tools/*.ts',
   *   description: 'Code review of tool implementations'
   * });
   * if (result.status === 'success' && result.type === 'text') {
   *   console.log(result.result); // Agent's response
   *   console.log(result.metadata.metrics?.totalCost); // Cost in USD
   *   console.log(result.metadata.executionTimeMs); // Duration
   *   console.log(result.metadata.toolCallsExecuted); // Number of tool calls
   * }
   * ```
   */
  async execute(params: AssignParams, context?: ToolExecutionContext): Promise<AssignResult> {
    if (!params.agent || typeof params.agent !== 'string') {
      return err('Parameter "agent" is required and must be a string', undefined, ErrorReason.InvalidInput);
    }

    if (!params.task || typeof params.task !== 'string') {
      return err('Parameter "task" is required and must be a string', undefined, ErrorReason.InvalidInput);
    }

    // Handle background execution
    // if (params.run_in_background) {
    //   if (!this.delegationService.delegateBackground) {
    //     return err(
    //       'Background execution is not supported by this delegation service.',
    //       { agentId: params.agent },
    //       ErrorReason.Unknown,
    //     );
    //   }

    //   const outcome = await this.delegationService.delegateBackground(params, context);

    //   if (!outcome.success) {
    //     return err(
    //       outcome.error ?? 'Failed to launch background agent.',
    //       { agentId: params.agent },
    //       ErrorReason.Unknown,
    //     );
    //   }

    //   return okText(
    //     `Agent "${params.agent}" launched in background with session ID: ${outcome.sessionId}. Use task_output tool to retrieve results.`,
    //     {
    //       sessionId: outcome.sessionId,
    //       agentId: params.agent,
    //       agentName: params.agent,
    //       runningInBackground: true,
    //       taskDescription: params.task,
    //       delegationDepth: (context?.delegationDepth ?? 0) + 1,
    //       toolCallsExecuted: 0,
    //       executionTimeMs: 0,
    //     },
    //   );
    // }

    const outcome = await this.delegationService.delegate(params, context);
    if (!outcome.success || !outcome.summary) {
      const isNotFound = outcome.error?.includes('not found');
      const isPolicyDenied = outcome.error?.includes('policy') || outcome.error?.includes('denied');
      return err(
        outcome.error ?? 'Failed to delegate task.',
        {
          agentId: params.agent,
          agentNotFound: isNotFound,
          policyDenied: isPolicyDenied,
          delegationDepth: context?.delegationDepth,
        },
        ErrorReason.Unknown,
      );
    }

    const metadata = outcome.metadata as DelegationMetadata;
    
    // Add system reminder about session ID for potential resume
    const sessionReminder = metadata.sessionId 
      ? `\n\n<system-reminder>\nAgent session ID: "${metadata.sessionId}"\nThis session can be resumed using the resume parameter in assign_task if the user has follow-up questions about this topic.\n</system-reminder>`
      : '';
    
    return okText(outcome.summary + sessionReminder, {
      ...metadata,
      taskDescription: params.task,
      delegationDepth: (context?.delegationDepth ?? 0) + 1,
    });
  }
}
