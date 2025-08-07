import { useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useSession } from '@/hooks/use-session';
import GameBoyConsole from '@/components/gameboy-console';
import GameBoyScreen from '@/components/gameboy-screen';
import { frequencies } from '@/lib/game-state';

export default function FrequencySelection() {
  const [, setLocation] = useLocation();
  const { session, setSession } = useSession();

  const updateSessionMutation = useMutation({
    mutationFn: async (frequency: string) => {
      if (!session?.userId) throw new Error('No user session');
      return apiRequest('PUT', `/api/session/${session.userId}`, {
        selectedFrequency: frequency
      });
    },
    onSuccess: async (response) => {
      const updatedSession = await response.json();
      setSession(updatedSession);
      setLocation('/simulation');
    },
  });

  const handleFrequencySelect = (frequencyId: string) => {
    updateSessionMutation.mutate(frequencyId);
  };

  const handleBack = () => {
    setLocation('/industry');
  };

  return (
    <GameBoyConsole>
      <GameBoyScreen title="FREQUENCY" showBack onBack={handleBack}>
        <div className="h-full space-y-3">
          {frequencies.map((frequency) => (
            <button
              key={frequency.id}
              onClick={() => handleFrequencySelect(frequency.id)}
              disabled={!frequency.enabled || updateSessionMutation.isPending}
              className={`w-full p-3 rounded text-xs transition-colors ${
                frequency.enabled
                  ? 'bg-gameboy-bg text-gameboy-screen hover:bg-gameboy-contrast'
                  : 'bg-gameboy-screen-dark text-gameboy-bg opacity-50 cursor-not-allowed'
              }`}
              data-testid={`frequency-${frequency.id}`}
            >
              {!frequency.enabled && '🔒 '}{frequency.name}
            </button>
          ))}
        </div>
      </GameBoyScreen>
    </GameBoyConsole>
  );
}
