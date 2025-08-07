import { useState } from 'react';
import { useLocation } from 'wouter';
import GameBoyConsole from '@/components/gameboy-console';
import GameBoyScreen from '@/components/gameboy-screen';
import HubSpotModal from '@/components/hubspot-modal';
import { useSession } from '@/hooks/use-session';
import { saasConnections } from '@/lib/game-state';

export default function Profile() {
  const [, setLocation] = useLocation();
  const [showHubSpotModal, setShowHubSpotModal] = useState(false);
  const { user, session } = useSession();

  const handleBack = () => {
    setLocation('/login');
  };

  const handleContinue = () => {
    if (!session?.hubspotToken) {
      // Could show a toast here asking to connect HubSpot first
    }
    setLocation('/theme');
  };

  const handleConnectionClick = (connectionId: string) => {
    if (connectionId === 'hubspot') {
      setShowHubSpotModal(true);
    }
  };

  const handleHubSpotSuccess = () => {
    setShowHubSpotModal(false);
  };

  return (
    <GameBoyConsole>
      <GameBoyScreen title="PROFILE" showBack onBack={handleBack}>
        <div className="h-full flex flex-col">
          {/* Player Info */}
          <div className="mb-4 p-2 bg-gameboy-screen-dark rounded text-center">
            <div className="text-gameboy-bg text-xs" data-testid="player-name">
              AGENT: {user?.username || 'UNKNOWN'}
            </div>
          </div>
          
          {/* SaaS Connections */}
          <div className="flex-1">
            <h3 className="text-gameboy-bg text-xs mb-3" data-testid="connections-title">
              SaaS CONNECTIONS
            </h3>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {saasConnections.map((connection) => (
                <button
                  key={connection.id}
                  onClick={() => handleConnectionClick(connection.id)}
                  disabled={!connection.enabled}
                  className={`p-3 rounded text-xs text-center transition-colors ${
                    connection.enabled
                      ? 'bg-gameboy-bg text-gameboy-screen hover:bg-gameboy-contrast'
                      : 'bg-gameboy-screen-dark text-gameboy-bg opacity-50 cursor-not-allowed'
                  }`}
                  data-testid={`connection-${connection.id}`}
                >
                  <div className="text-xs mb-1">{connection.icon}</div>
                  <div>{connection.name}</div>
                  {connection.id === 'hubspot' && session?.hubspotToken && (
                    <div className="text-xs mt-1">✓ CONNECTED</div>
                  )}
                </button>
              ))}
            </div>
          </div>
          
          <button
            onClick={handleContinue}
            className="w-full bg-gameboy-bg text-gameboy-screen py-2 px-4 rounded text-xs font-bold hover:bg-gameboy-contrast transition-colors"
            data-testid="button-continue"
          >
            CONTINUE
          </button>
        </div>
      </GameBoyScreen>

      <HubSpotModal
        isOpen={showHubSpotModal}
        onClose={() => setShowHubSpotModal(false)}
        onSuccess={handleHubSpotSuccess}
      />
    </GameBoyConsole>
  );
}
