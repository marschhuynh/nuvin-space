import type { ToolDefinition, ToolExecutionResult, ToolInvocation, ToolPort } from './ports';

export class CompositeToolPort implements ToolPort {
  constructor(private ports: ToolPort[]) {}

  getToolDefinitions(enabledTools: string[]): ToolDefinition[] {
    const all: ToolDefinition[] = [];
    for (const p of this.ports) {
      try {
        all.push(...p.getToolDefinitions(enabledTools));
      } catch {
        // ignore individual port errors
      }
    }
    return all;
  }

  async executeToolCalls(
    calls: ToolInvocation[],
    context?: Record<string, unknown>,
    maxConcurrent = 3,
  ): Promise<ToolExecutionResult[]> {
    // Partition calls by which port has definition for the tool name
    const portDefs = this.ports.map((p) => new Set(p.getToolDefinitions(calls.map((c) => c.name)).map((d) => d.function.name)));

    const portBatches: ToolInvocation[][] = this.ports.map(() => [] as ToolInvocation[]);
    const fallbackBatch: ToolInvocation[] = [];

    for (const c of calls) {
      let assigned = false;
      for (let i = 0; i < portDefs.length; i++) {
        if (portDefs[i].has(c.name)) {
          portBatches[i].push(c);
          assigned = true;
          break;
        }
      }
      if (!assigned) fallbackBatch.push(c);
    }

    const results: ToolExecutionResult[] = [];
    for (let i = 0; i < this.ports.length; i++) {
      if (portBatches[i].length === 0) continue;
      const out = await this.ports[i].executeToolCalls(portBatches[i], context, maxConcurrent);
      results.push(...out);
    }

    // Any unassigned calls get an error result
    for (const c of fallbackBatch) {
      results.push({ id: c.id, name: c.name, status: 'error', type: 'text', result: `No tool found for ${c.name}` });
    }

    return results;
  }
}

