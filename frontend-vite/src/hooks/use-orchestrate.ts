import { useQuery } from '@tanstack/react-query';
import { fetchAgents } from '@/lib/agent-api';

export function useOrchestrate() {
  const query = useQuery({
    queryKey: ['orchestrate'],
    queryFn: fetchAgents,
    refetchInterval: 5000,
  });
  return { agents: query.data?.agents || [], isLoading: query.isLoading };
}
