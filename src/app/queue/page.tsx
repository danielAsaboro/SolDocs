"use client";

import { useAgentStatus } from "@/hooks/useAgentStatus";
import { useQueue } from "@/hooks/useQueue";
import { AgentStatusCard } from "@/components/queue/AgentStatusCard";
import { QueueTable } from "@/components/queue/QueueTable";

export default function QueuePage() {
  const status = useAgentStatus();
  const { queue, loading } = useQueue();

  return (
    <>
      <h1 className="mb-6 text-2xl font-bold text-sol-text">
        Agent Dashboard
      </h1>
      <AgentStatusCard status={status} />
      <h2 className="mb-4 text-lg font-semibold text-sol-text">
        Processing Queue
      </h2>
      <QueueTable queue={queue} loading={loading} />
    </>
  );
}
