import { useQuery } from '@tanstack/react-query';
import { fetchObservabilityDashboard, fetchObservabilityHealth } from '@/lib/agent-api';

export function useObservability() {
  const dashboardQuery = useQuery({
    queryKey: ['observability-dashboard'],
    queryFn: fetchObservabilityDashboard,
    refetchInterval: 3000,
  });

  const healthQuery = useQuery({
    queryKey: ['observability-health'],
    queryFn: fetchObservabilityHealth,
    refetchInterval: 5000,
  });

  return {
    dashboard: dashboardQuery.data,
    health: healthQuery.data,
    isLoading: dashboardQuery.isLoading || healthQuery.isLoading,
  };
}
