
import { useEffect } from 'react';
import { useSession } from '@/hooks/use-session';

export default function DevBypass({ children }: { children: React.ReactNode }) {
  const { setUser, setSession } = useSession();

  useEffect(() => {
    // Auto-login with test user for development
    const testUser = {
      id: 1,
      username: 'DevUser',
      password: 'test123',
      email: 'dev@example.com',
      playerTier: 'Premium',
      creditLimit: 1000,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const testSession = {
      id: 1,
      userId: 1,
      hubspotToken: null,
      hubspotRefreshToken: null,
      selectedTheme: null,
      selectedIndustry: null,
      selectedFrequency: null,
      simulationConfig: null,
      isActive: true,
      expiresAt: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    setUser(testUser);
    setSession(testSession);
  }, [setUser, setSession]);

  return <>{children}</>;
}
