import { useLocation } from 'wouter';
import GameBoyConsole from '@/components/gameboy-console';
import GameBoyScreen from '@/components/gameboy-screen';

export default function Landing() {
  const [, setLocation] = useLocation();

  const handleStart = () => {
    setLocation('/login');
  };

  return (
    <GameBoyConsole onStartClick={handleStart}>
      <GameBoyScreen>
        <div className="h-full flex flex-col justify-center">
          <div className="text-center mb-6">
            <h1 className="text-gameboy-bg text-lg mb-2" data-testid="title">
              SimCRM.
            </h1>
            <div className="text-gameboy-bg text-xs animate-blink" data-testid="press-start">
              PRESS START
            </div>
          </div>
          
          <div className="text-center text-xs text-gameboy-bg space-y-2">
            <div>A retro CRM simulation</div>
            <div>experience powered by</div>
            <div>HubSpot integration</div>
          </div>
        </div>
      </GameBoyScreen>
    </GameBoyConsole>
  );
}
