
import { useEffect } from 'react';
import { useSession } from '@/hooks/use-session';

export default function DevBypass({ children }: { children: React.ReactNode }) {
  const { setUser, setSession } = useSession();

  useEffect(() => {
    // Auto-login with test user for development
    const testUser = {
      id: 'dev-user-1',
      username: 'DevUser',
      playerTier: 'Premium',
      creditLimit: 1000
    };

    const testSession = {
      id: 'dev-session-1',
      userId: 'dev-user-1',
      hubspotToken: null
    };

    setUser(testUser);
    setSession(testSession);
  }, [setUser, setSession]);

  return <>{children}</>;
}
