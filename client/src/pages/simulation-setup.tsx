import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useSession } from '@/hooks/use-session';
import { useToast } from '@/hooks/use-toast';
import GameBoyConsole from '@/components/gameboy-console';
import GameBoyScreen from '@/components/gameboy-screen';
import MixerChannel from '@/components/mixer-channel';
import { hubspotObjects } from '@/lib/game-state';
import type { PlayerTier } from '@shared/schema';

interface SimulationSettings {
  [key: string]: {
    value: number;
    autoDistribution: boolean;
  };
}

export default function SimulationSetup() {
  const [, setLocation] = useLocation();
  const { session } = useSession();
  const { toast } = useToast();
  
  const [settings, setSettings] = useState<SimulationSettings>(() => {
    const initialSettings: SimulationSettings = {};
    hubspotObjects.forEach(obj => {
      initialSettings[obj.id] = {
        value: obj.defaultValue,
        autoDistribution: false
      };
    });
    return initialSettings;
  });

  const { data: playerTier } = useQuery<PlayerTier>({
    queryKey: ['/api/player-tiers', session?.playerTier || 'new-player'],
  });

  const startSimulationMutation = useMutation({
    mutationFn: async (simulationSettings: SimulationSettings) => {
      if (!session?.userId) throw new Error('No user session');
      return apiRequest('POST', '/api/simulation/start', {
        userId: session.userId,
        settings: simulationSettings
      });
    },
    onSuccess: async (response) => {
      const result = await response.json();
      toast({
        title: "Simulation Started",
        description: `Simulation ${result.simulationId} is now running!`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start simulation",
        variant: "destructive",
      });
    },
  });

  const totalCreditsUsed = Object.values(settings).reduce((sum, setting) => sum + setting.value, 0);
  const creditsRemaining = (playerTier?.creditLimit || 150) - totalCreditsUsed;

  const handleSliderChange = (objectId: string, value: number) => {
    setSettings(prev => ({
      ...prev,
      [objectId]: { ...prev[objectId], value }
    }));
  };

  const handleAutoToggle = (objectId: string, enabled: boolean) => {
    setSettings(prev => {
      const newSettings = {
        ...prev,
        [objectId]: { ...prev[objectId], autoDistribution: enabled }
      };

      if (enabled) {
        // Calculate average value for synchronization
        const enabledObjects = hubspotObjects.filter(obj => obj.enabled);
        const totalValue = enabledObjects.reduce((sum, obj) => sum + newSettings[obj.id].value, 0);
        const avgValue = Math.round(totalValue / enabledObjects.length);

        // Synchronize all enabled sliders
        enabledObjects.forEach(obj => {
          newSettings[obj.id].value = avgValue;
          newSettings[obj.id].autoDistribution = true;
        });
      }

      return newSettings;
    });
  };

  const handleStartSimulation = () => {
    if (!session?.hubspotToken) {
      toast({
        title: "Error",
        description: "Please connect your HubSpot account first",
        variant: "destructive",
      });
      return;
    }

    if (creditsRemaining < 0) {
      toast({
        title: "Error",
        description: "Credit limit exceeded. Please reduce slider values.",
        variant: "destructive",
      });
      return;
    }

    startSimulationMutation.mutate(settings);
  };

  const handleBack = () => {
    setLocation('/frequency');
  };

  return (
    <GameBoyConsole>
      <GameBoyScreen title="SIMULATION" showBack onBack={handleBack}>
        <div className="h-full flex flex-col">
          {/* Player Tier Display */}
          <div className="bg-gameboy-bg text-gameboy-screen p-2 rounded mb-3 text-center">
            <div className="text-xs" data-testid="player-tier">
              {playerTier?.name || 'NEW PLAYER'}
            </div>
            <div className="text-xs" data-testid="credits-display">
              CREDITS: <span className={creditsRemaining < 0 ? 'text-red-300' : ''}>
                {creditsRemaining}
              </span>
            </div>
          </div>
          
          {/* Mixer Board Style Controls */}
          <div className="flex-1 grid grid-cols-3 gap-2 mb-3">
            {hubspotObjects.map((obj) => (
              <MixerChannel
                key={obj.id}
                name={obj.name}
                value={settings[obj.id].value}
                onChange={(value) => handleSliderChange(obj.id, value)}
                enabled={obj.enabled}
                autoDistribution={settings[obj.id].autoDistribution}
                onAutoToggle={(enabled) => handleAutoToggle(obj.id, enabled)}
              />
            ))}
          </div>
          
          <button
            onClick={handleStartSimulation}
            disabled={startSimulationMutation.isPending || creditsRemaining < 0}
            className="w-full bg-gameboy-bg text-gameboy-screen py-2 px-4 rounded text-xs font-bold hover:bg-gameboy-contrast transition-colors disabled:opacity-50"
            data-testid="button-start-simulation"
          >
            {startSimulationMutation.isPending ? 'STARTING...' : 'START SIMULATION'}
          </button>
        </div>
      </GameBoyScreen>
    </GameBoyConsole>
  );
}
