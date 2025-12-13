import type { MessageLine } from '@/adapters/index.js';

function hasAnyPendingToolCalls(msg: MessageLine): boolean {
  if (msg.type !== 'tool') return false;

  const toolCalls = msg.metadata?.toolCalls || [];
  const toolResultsByCallId = msg.metadata?.toolResultsByCallId as Map<string, MessageLine> | undefined;

  if (toolCalls.length === 0) return false;

  for (const toolCall of toolCalls) {
    const hasResult = toolResultsByCallId?.has(toolCall.id);
    if (!hasResult) {
      return true;
    }
  }

  return false;
}

function isLastNonTransientMessage(msgs: MessageLine[], index: number): boolean {
  for (let i = index + 1; i < msgs.length; i++) {
    if (msgs[i].metadata?.isTransient !== true) {
      return false;
    }
  }
  return true;
}

export function calculateStaticCount(msgs: MessageLine[]): number {
  let dynamicCount = 0;

  for (let i = msgs.length - 1; i >= 0; i--) {
    const msg = msgs[i];

    if (msg.metadata?.isTransient === true) {
      continue;
    }

    if (msg.metadata?.isStreaming === true && isLastNonTransientMessage(msgs, i)) {
      dynamicCount = msgs.length - i;
      break;
    }

    if (hasAnyPendingToolCalls(msg)) {
      dynamicCount = msgs.length - i;
      break;
    }
  }

  return Math.max(0, msgs.length - dynamicCount);
}
