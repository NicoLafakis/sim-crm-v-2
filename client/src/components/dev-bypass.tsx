
import { useEffect } from 'react';
import { useSession } from '@/hooks/use-session';

export default function DevBypass({ children }: { children: React.ReactNode }) {
  const { user, session, setUser, setSession } = useSession();

  useEffect(() => {
    // Only seed defaults if nothing exists and only in development
    if (import.meta.env.DEV && !user && !session) {
      console.log('🔧 DevBypass: Seeding development defaults');
      
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
    } else if (user || session) {
      console.log('🔧 DevBypass: Existing session found, preserving it');
    }
  }, [user, session, setUser, setSession]);

  return <>{children}</>;
}
