import { useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useSession } from '@/hooks/use-session';
import GameBoyConsole from '@/components/gameboy-console';
import GameBoyScreen from '@/components/gameboy-screen';
import { themes } from '@/lib/game-state';

export default function ThemeSelection() {
  const [, setLocation] = useLocation();
  const { session, setSession } = useSession();

  const updateSessionMutation = useMutation({
    mutationFn: async (theme: string) => {
      if (!session?.userId) throw new Error('No user session');
      return apiRequest('PUT', `/api/session/${session.userId}`, {
        selectedTheme: theme
      });
    },
    onSuccess: async (response) => {
      const updatedSession = await response.json();
      setSession(updatedSession);
      setLocation('/industry');
    },
  });

  const handleThemeSelect = (themeId: string) => {
    updateSessionMutation.mutate(themeId);
  };

  const handleBack = () => {
    setLocation('/profile');
  };

  return (
    <GameBoyConsole>
      <GameBoyScreen title="SELECT THEME" showBack onBack={handleBack}>
        <div className="h-full overflow-y-auto space-y-3">
          {Object.entries(themes).map(([category, items]) => (
            <div key={category}>
              <h3 className="text-gameboy-bg text-xs mb-2 uppercase" data-testid={`category-${category}`}>
                {category.replace('-', ' ')}
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {items.map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => handleThemeSelect(theme.id)}
                    disabled={updateSessionMutation.isPending}
                    className="bg-gameboy-bg text-gameboy-screen p-2 rounded text-xs hover:bg-gameboy-contrast transition-colors disabled:opacity-50"
                    data-testid={`theme-${theme.id}`}
                  >
                    {theme.icon} {theme.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </GameBoyScreen>
    </GameBoyConsole>
  );
}
