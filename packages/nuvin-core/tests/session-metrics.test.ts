import { describe, it, expect, beforeEach } from 'vitest';
import { SessionMetricsTracker, type SessionMetrics, type MetricsUpdate } from '../session-metrics.js';

describe('SessionMetricsTracker', () => {
  let tracker: SessionMetricsTracker;

  beforeEach(() => {
    tracker = new SessionMetricsTracker();
  });

  describe('get', () => {
    it('should return null for unknown conversation', () => {
      expect(tracker.get('unknown')).toBeNull();
    });

    it('should return a copy of metrics', () => {
      tracker.record('test', { totalTokens: 100 });
      const m1 = tracker.get('test');
      const m2 = tracker.get('test');
      expect(m1).toEqual(m2);
      expect(m1).not.toBe(m2);
    });
  });

  describe('record', () => {
    it('should initialize with zero values on first record', () => {
      const result = tracker.record('test', {});
      expect(result).toEqual({
        totalTokens: 0,
        totalPromptTokens: 0,
        totalCompletionTokens: 0,
        requestCount: 1,
        toolCallCount: 0,
        totalTimeMs: 0,
        totalPrice: 0,
        currentWindowTokens: 0,
        currentWindowPromptTokens: 0,
        currentWindowCompletionTokens: 0,
      });
    });

    it('should track cumulative totals across multiple records', () => {
      tracker.record('test', { totalTokens: 100, promptTokens: 60, completionTokens: 40 });
      tracker.record('test', { totalTokens: 200, promptTokens: 120, completionTokens: 80 });

      const metrics = tracker.get('test')!;
      expect(metrics.totalTokens).toBe(300);
      expect(metrics.totalPromptTokens).toBe(180);
      expect(metrics.totalCompletionTokens).toBe(120);
      expect(metrics.requestCount).toBe(2);
    });

    it('should track current window separately from totals', () => {
      tracker.record('test', { totalTokens: 100, promptTokens: 60, completionTokens: 40 });
      tracker.record('test', { totalTokens: 200, promptTokens: 120, completionTokens: 80 });

      const metrics = tracker.get('test')!;
      expect(metrics.currentWindowTokens).toBe(200);
      expect(metrics.currentWindowPromptTokens).toBe(120);
      expect(metrics.currentWindowCompletionTokens).toBe(80);
      expect(metrics.totalTokens).toBe(300);
    });

    it('should accumulate tool calls', () => {
      tracker.record('test', { toolCalls: 3 });
      tracker.record('test', { toolCalls: 2 });

      const metrics = tracker.get('test')!;
      expect(metrics.toolCallCount).toBe(5);
    });

    it('should accumulate response time', () => {
      tracker.record('test', { responseTimeMs: 1000 });
      tracker.record('test', { responseTimeMs: 500 });

      const metrics = tracker.get('test')!;
      expect(metrics.totalTimeMs).toBe(1500);
    });

    it('should accumulate cost', () => {
      tracker.record('test', { cost: 0.005 });
      tracker.record('test', { cost: 0.003 });

      const metrics = tracker.get('test')!;
      expect(metrics.totalPrice).toBeCloseTo(0.008);
    });

    it('should handle undefined values gracefully', () => {
      tracker.record('test', {
        totalTokens: undefined,
        promptTokens: undefined,
        completionTokens: undefined,
        toolCalls: undefined,
        responseTimeMs: undefined,
        cost: undefined,
      });

      const metrics = tracker.get('test')!;
      expect(metrics.totalTokens).toBe(0);
      expect(metrics.requestCount).toBe(1);
    });

    it('should return a copy of updated metrics', () => {
      const result = tracker.record('test', { totalTokens: 100 });
      result.totalTokens = 999;

      const metrics = tracker.get('test')!;
      expect(metrics.totalTokens).toBe(100);
    });
  });

  describe('multiple conversations', () => {
    it('should track conversations independently', () => {
      tracker.record('conv1', { totalTokens: 100, toolCalls: 2 });
      tracker.record('conv2', { totalTokens: 200, toolCalls: 5 });

      const m1 = tracker.get('conv1')!;
      const m2 = tracker.get('conv2')!;

      expect(m1.totalTokens).toBe(100);
      expect(m1.toolCallCount).toBe(2);
      expect(m2.totalTokens).toBe(200);
      expect(m2.toolCallCount).toBe(5);
    });
  });

  describe('reset', () => {
    it('should reset specific conversation metrics', () => {
      tracker.record('conv1', { totalTokens: 100 });
      tracker.record('conv2', { totalTokens: 200 });

      tracker.reset('conv1');

      expect(tracker.get('conv1')).toBeNull();
      expect(tracker.get('conv2')).not.toBeNull();
    });
  });

  describe('clear', () => {
    it('should clear all conversation metrics', () => {
      tracker.record('conv1', { totalTokens: 100 });
      tracker.record('conv2', { totalTokens: 200 });

      tracker.clear();

      expect(tracker.get('conv1')).toBeNull();
      expect(tracker.get('conv2')).toBeNull();
    });
  });
});
