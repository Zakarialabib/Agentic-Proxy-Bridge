import { useQuery } from '@tanstack/react-query';
import { fetchWorklogs } from '@/lib/agent-api';

export function useWorklogs() {
  const worklogQuery = useQuery({
    queryKey: ['worklogs'],
    queryFn: fetchWorklogs,
    refetchInterval: 5000,
  });

  return {
    worklogs: worklogQuery.data || [],
    isLoading: worklogQuery.isLoading,
  };
}
