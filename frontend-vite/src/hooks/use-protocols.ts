import { useQuery } from '@tanstack/react-query';
import { fetchProtocols } from '@/lib/agent-api';

export function useProtocols() {
  const query = useQuery({
    queryKey: ['protocols'],
    queryFn: fetchProtocols,
    refetchInterval: 5000,
  });
  return { protocols: query.data, isLoading: query.isLoading };
}
