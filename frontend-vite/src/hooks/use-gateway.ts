import { useQuery } from '@tanstack/react-query';
import { fetchGatewayStatus } from '@/lib/agent-api';

export function useGateway() {
  const query = useQuery({
    queryKey: ['gateway'],
    queryFn: fetchGatewayStatus,
    refetchInterval: 5000,
  });
  return { gateway: query.data, isLoading: query.isLoading };
}
