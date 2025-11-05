import type { CostCalculator, UsageData } from './ports.js';

export class SimpleCost implements CostCalculator {
  // Demo cost: $0.00 (undefined) to avoid implying pricing; could be extended
  estimate(_model: string, _usage?: UsageData): number | undefined {
    return undefined;
  }
}
