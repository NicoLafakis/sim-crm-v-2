import { useQuery } from '@tanstack/react-query';
import { useSession } from './use-session';

interface HubSpotStatus {
  connected: boolean;
  hasToken: boolean;
  status: string;
  tokenSource: string;
}

export function useHubSpotValidation() {
  const { user } = useSession();

  const { data: hubspotStatus, isLoading } = useQuery<HubSpotStatus>({
    queryKey: [`/api/hubspot/status/${user?.id}`],
    enabled: !!user?.id,
    retry: false,
  });

  return {
    isConnected: hubspotStatus?.connected || false,
    hasToken: hubspotStatus?.hasToken || false,
    isLoading,
    tokenStatus: hubspotStatus?.status || 'unknown',
  };
}