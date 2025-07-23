import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Bot, Clock, DollarSign, Hash, Zap } from 'lucide-react';
import { AgentManager, type AgentStatus } from '@/lib/agent-manager';
import { useAgentStore } from '@/store/useAgentStore';
import { useConversationStore } from '@/store';
import { formatCost } from '@/lib/utils/cost-calculator';

interface AgentStatusDisplayProps {
  className?: string;
}

export function AgentStatusDisplay({ className }: AgentStatusDisplayProps) {
  const { agents, activeAgentId } = useAgentStore();
  const { activeConversationId } = useConversationStore();
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null);
  const [conversationMetrics, setConversationMetrics] = useState<{
    totalTokens: number;
    totalCost: number;
    messageCount: number;
  } | null>(null);

  const activeAgent = agents.find((agent) => agent.id === activeAgentId);

  useEffect(() => {
    if (!activeAgent) {
      setAgentStatus(null);
      return;
    }

    const agentManager = AgentManager.getInstance();
    const status = agentManager.getAgentStatus(activeAgent);
    setAgentStatus(status);
  }, [activeAgent]);

  useEffect(() => {
    if (!activeConversationId) {
      setConversationMetrics(null);
      return;
    }

    const agentManager = AgentManager.getInstance();
    const metrics = agentManager.getConversationMetrics(activeConversationId);
    console.log('Conversation Metrics:', metrics, activeConversationId);
    setConversationMetrics(metrics);
  }, [activeConversationId]);

  if (!activeAgent || !agentStatus) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Bot className="h-4 w-4" />
            Agent Status
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground">No agent selected</p>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-500';
      case 'busy':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
      case 'offline':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatTime = (ms: number): string => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Bot className="h-4 w-4" />
          Agent Status
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {/* Agent Info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${getStatusColor(agentStatus.status)}`}
            />
            <span className="text-sm font-medium">{agentStatus.name}</span>
          </div>
          <Badge variant="outline" className="text-xs">
            {agentStatus.type}
          </Badge>
        </div>

        <Separator />

        {/* Session Metrics */}
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Session Total
          </h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1">
              <Hash className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">Tokens:</span>
              <span className="font-medium">
                {formatNumber(agentStatus.totalTokensUsed || 0)}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <DollarSign className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">Cost:</span>
              <span className="font-medium">
                {formatCost(agentStatus.totalCost || 0)}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Bot className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">Messages:</span>
              <span className="font-medium">
                {agentStatus.messagesProcessed || 0}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">Avg Time:</span>
              <span className="font-medium">
                {formatTime(agentStatus.averageResponseTime || 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Conversation Metrics */}
        {conversationMetrics && activeConversationId && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                This Conversation
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1">
                  <Hash className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Tokens:</span>
                  <span className="font-medium">
                    {formatNumber(conversationMetrics.totalTokens)}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Cost:</span>
                  <span className="font-medium">
                    {formatCost(conversationMetrics.totalCost)}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Bot className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Messages:</span>
                  <span className="font-medium">
                    {conversationMetrics.messageCount}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
