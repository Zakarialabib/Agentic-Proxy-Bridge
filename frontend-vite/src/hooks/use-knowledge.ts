import { useQuery } from '@tanstack/react-query';
import { fetchKnowledgeStatus } from '@/lib/agent-api';

export function useKnowledge() {
  const query = useQuery({
    queryKey: ['knowledge'],
    queryFn: fetchKnowledgeStatus,
    refetchInterval: 5000,
  });
  return { knowledge: query.data, isLoading: query.isLoading };
}
