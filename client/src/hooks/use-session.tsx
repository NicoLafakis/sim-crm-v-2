import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Session } from '@shared/schema';

interface SessionState {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  logout: () => void;
}

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      user: null,
      session: null,
      isAuthenticated: false,
      setUser: (user: User | null) => set(() => ({ 
        user, 
        isAuthenticated: !!user 
      })),
      setSession: (session: Session | null) => set(() => ({ session })),
      logout: () => set(() => ({ 
        user: null, 
        session: null, 
        isAuthenticated: false 
      })),
    }),
    {
      name: 'simcrm-session',
    }
  )
);
