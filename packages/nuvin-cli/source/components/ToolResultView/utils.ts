import { stripAnsiAndControls, type ToolExecutionResult } from '@nuvin/nuvin-core';

const stripSystemReminder = (text: string): string => {
  return text.replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, '').trim();
};

export const parseDetailLines = ({
  status,
  messageContent,
  toolResult,
}: {
  status: string;
  messageContent?: string;
  toolResult: ToolExecutionResult;
}) => {
  let result: string[] = [];

  if (status !== 'success') {
    const errorText = messageContent?.replace(/^error:\s*/i, '').trim();
    result = errorText ? errorText.split(/\r?\n/) : [];
  }

  if (toolResult.type === 'text') {
    const textResult = toolResult.result as string;
    const cleaned = stripAnsiAndControls(textResult);
    const withoutReminder = stripSystemReminder(cleaned);
    const trimmed = withoutReminder.trim();
    result = trimmed ? trimmed.split(/\r?\n/) : [];
  } else if (toolResult.type === 'json') {
    result = JSON.stringify(toolResult.result, null, 2).split(/\r?\n/);
  }

  return result.filter((line) => line.trim().length > 0);
};
