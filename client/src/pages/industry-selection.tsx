import { useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useSession } from '@/hooks/use-session';
import GameBoyConsole from '@/components/gameboy-console';
import GameBoyScreen from '@/components/gameboy-screen';
import { industries } from '@/lib/game-state';

export default function IndustrySelection() {
  const [, setLocation] = useLocation();
  const { session, setSession } = useSession();

  const updateSessionMutation = useMutation({
    mutationFn: async (industry: string) => {
      if (!session?.userId) throw new Error('No user session');
      return apiRequest('PUT', `/api/session/${session.userId}`, {
        selectedIndustry: industry
      });
    },
    onSuccess: async (response) => {
      const updatedSession = await response.json();
      setSession(updatedSession);
      setLocation('/frequency');
    },
  });

  const handleIndustrySelect = (industryId: string) => {
    updateSessionMutation.mutate(industryId);
  };

  const handleBack = () => {
    setLocation('/theme');
  };

  return (
    <GameBoyConsole>
      <GameBoyScreen title="INDUSTRY" showBack onBack={handleBack}>
        <div className="h-full overflow-y-auto space-y-2">
          {industries.map((industry) => (
            <button
              key={industry.id}
              onClick={() => handleIndustrySelect(industry.id)}
              disabled={updateSessionMutation.isPending}
              className="w-full bg-gameboy-bg text-gameboy-screen p-2 rounded text-xs hover:bg-gameboy-contrast transition-colors disabled:opacity-50"
              data-testid={`industry-${industry.id}`}
            >
              {industry.icon} {industry.name}
            </button>
          ))}
        </div>
      </GameBoyScreen>
    </GameBoyConsole>
  );
}
