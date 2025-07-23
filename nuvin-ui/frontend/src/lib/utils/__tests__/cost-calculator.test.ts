import { describe, it, expect } from 'vitest';
import { formatCost } from '../cost-calculator';

describe('formatCost', () => {
  it('formats zero cost correctly', () => {
    expect(formatCost(0)).toBe('$0.00');
  });

  it('formats small costs with appropriate precision', () => {
    expect(formatCost(0.001)).toBe('$0.0010');
    expect(formatCost(0.0001)).toBe('$0.00010');
    expect(formatCost(0.00001)).toBe('$0.000010');
  });

  it('formats regular costs with 2 decimal places', () => {
    expect(formatCost(1.23)).toBe('$1.23');
    expect(formatCost(10.456)).toBe('$10.46');
    expect(formatCost(100)).toBe('$100.00');
  });

  it('formats large costs correctly', () => {
    expect(formatCost(1000.123)).toBe('$1000.12');
    expect(formatCost(10000.99)).toBe('$10000.99');
  });

  it('handles very small fractional costs', () => {
    expect(formatCost(0.000001)).toBe('$0.0000010');
    expect(formatCost(0.0000001)).toBe('$0.00000010');
  });

  it('rounds appropriately for regular amounts', () => {
    expect(formatCost(1.234)).toBe('$1.23');
    expect(formatCost(1.235)).toBe('$1.24');
    expect(formatCost(1.999)).toBe('$2.00');
  });

  it('handles negative costs', () => {
    expect(formatCost(-1.23)).toBe('-$1.23');
    expect(formatCost(-0.001)).toBe('-$0.0010');
  });

  it('handles edge cases', () => {
    expect(formatCost(NaN)).toBe('$0.00');
    expect(formatCost(Infinity)).toBe('$0.00');
    expect(formatCost(-Infinity)).toBe('$0.00');
  });

  it('preserves precision for very small amounts', () => {
    const verySmallAmounts = [
      { amount: 0.000123, expected: '$0.00012' },
      { amount: 0.0000456, expected: '$0.000046' },
      { amount: 0.00000789, expected: '$0.0000079' },
      { amount: 0.000000123, expected: '$0.00000012' },
    ];

    verySmallAmounts.forEach(({ amount, expected }) => {
      const formatted = formatCost(amount);
      expect(formatted).toBe(expected);
    });
  });
});
