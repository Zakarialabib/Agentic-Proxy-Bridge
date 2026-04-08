import { useQuery } from '@tanstack/react-query';
import { fetchToolsList } from '@/lib/agent-api';

export function useToolsData() {
  const toolsQuery = useQuery({
    queryKey: ['tools-list'],
    queryFn: fetchToolsList,
    refetchInterval: 10000,
  });

  return {
    tools: toolsQuery.data?.tools || [],
    total: toolsQuery.data?.total || 0,
    isLoading: toolsQuery.isLoading,
  };
}
