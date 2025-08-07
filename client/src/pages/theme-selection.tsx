import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { useSession } from '@/hooks/use-session';
import { useHubSpotValidation } from '@/hooks/use-hubspot-validation';
import { useState } from 'react';

export default function ThemeSelection() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useSession();
  const { isConnected, isLoading: validationLoading } = useHubSpotValidation();
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);

  const handleThemeSelect = (themeId: string) => {
    setSelectedTheme(themeId);
    toast({
      title: "Theme Selected",
      description: `${themeId} theme selected. Ready to proceed to simulation setup!`,
    });
  };

  const handleProceedToSimulation = () => {
    if (!selectedTheme) {
      toast({
        title: "No Theme Selected",
        description: "Please select a theme before proceeding to simulation setup.",
        variant: "destructive",
      });
      return;
    }

    if (!isConnected) {
      toast({
        title: "HubSpot Connection Required",
        description: "You need to connect your HubSpot account before starting a simulation.",
        variant: "destructive",
      });
      // Redirect back to HubSpot setup with context
      setLocation('/hubspot-setup?redirect=simulation&theme=' + selectedTheme);
      return;
    }

    // Proceed to industry selection
    toast({
      title: "Theme Selected",
      description: `Proceeding with ${selectedTheme} theme`,
    });
    
    setLocation('/industry-selection');
  };

  return (
    <div className="min-h-screen font-gameboy" 
         style={{ 
           backgroundColor: 'rgb(34, 78, 34)',
           backgroundImage: 'linear-gradient(rgba(70, 120, 70, 0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(70, 120, 70, 0.6) 1px, transparent 1px)',
           backgroundSize: '20px 20px'
         }}>
      
      {/* Header */}
      <div className="text-center pt-8 pb-6" style={{ 
        backgroundColor: 'rgb(34, 78, 34)',
        backgroundImage: 'linear-gradient(rgba(70, 120, 70, 0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(70, 120, 70, 0.6) 1px, transparent 1px)',
        backgroundSize: '20px 20px'
      }}>
        <h1 className="text-2xl font-bold uppercase tracking-wider mb-2" style={{ color: 'rgb(200, 220, 140)' }}>
          Select a Theme
        </h1>
      </div>
      
      {/* Music Section */}
      <div className="px-8 mb-8" style={{ 
        backgroundColor: 'rgb(34, 78, 34)',
        backgroundImage: 'linear-gradient(rgba(70, 120, 70, 0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(70, 120, 70, 0.6) 1px, transparent 1px)',
        backgroundSize: '20px 20px'
      }}>
        <h2 className="text-lg font-bold uppercase tracking-wide text-center mb-6" style={{ color: 'rgb(200, 220, 140)' }}>
          Music
        </h2>
        <div className="grid grid-cols-4 gap-6 max-w-4xl mx-auto">
          {/* Beatles */}
          <button
            onClick={() => handleThemeSelect('Beatles')}
            className={`h-24 rounded border-2 text-center flex flex-col justify-center items-center transition-all ${
              selectedTheme === 'Beatles' 
                ? 'border-yellow-400 bg-yellow-600 text-white' 
                : 'border-blue-600 bg-blue-900 text-white hover:bg-blue-800'
            } cursor-pointer`}
            data-testid="theme-beatles"
          >
            <div className="text-lg mb-1">🎸</div>
            <div className="text-xs font-bold uppercase tracking-wide">
              Beatles
            </div>
          </button>
          
          {/* Madonna */}
          <button
            onClick={() => handleThemeSelect('Madonna')}
            className={`h-24 rounded border-2 text-center flex flex-col justify-center items-center transition-all ${
              selectedTheme === 'Madonna' 
                ? 'border-yellow-400 bg-yellow-600 text-white' 
                : 'border-blue-600 bg-blue-900 text-white hover:bg-blue-800'
            } cursor-pointer`}
            data-testid="theme-madonna"
          >
            <div className="text-lg mb-1">🎤</div>
            <div className="text-xs font-bold uppercase tracking-wide">
              Madonna
            </div>
          </button>
          
          {/* Drake */}
          <button
            onClick={() => handleThemeSelect('Drake')}
            className={`h-24 rounded border-2 text-center flex flex-col justify-center items-center transition-all ${
              selectedTheme === 'Drake' 
                ? 'border-yellow-400 bg-yellow-600 text-white' 
                : 'border-blue-600 bg-blue-900 text-white hover:bg-blue-800'
            } cursor-pointer`}
            data-testid="theme-drake"
          >
            <div className="text-lg mb-1">🎵</div>
            <div className="text-xs font-bold uppercase tracking-wide">
              Drake
            </div>
          </button>
          
          {/* Daft Punk */}
          <button
            onClick={() => handleThemeSelect('Daft Punk')}
            className={`h-24 rounded border-2 text-center flex flex-col justify-center items-center transition-all ${
              selectedTheme === 'Daft Punk' 
                ? 'border-yellow-400 bg-yellow-600 text-white' 
                : 'border-blue-600 bg-blue-900 text-white hover:bg-blue-800'
            } cursor-pointer`}
            data-testid="theme-daftpunk"
          >
            <div className="text-lg mb-1">🎹</div>
            <div className="text-xs font-bold uppercase tracking-wide">
              Daft Punk
            </div>
          </button>
        </div>
      </div>
      
      {/* Movies Section */}
      <div className="px-8 mb-8" style={{ 
        backgroundColor: 'rgb(34, 78, 34)',
        backgroundImage: 'linear-gradient(rgba(70, 120, 70, 0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(70, 120, 70, 0.6) 1px, transparent 1px)',
        backgroundSize: '20px 20px'
      }}>
        <h2 className="text-lg font-bold uppercase tracking-wide text-center mb-6" style={{ color: 'rgb(200, 220, 140)' }}>
          Movies
        </h2>
        <div className="grid grid-cols-4 gap-6 max-w-4xl mx-auto">
          {/* Star Wars */}
          <button
            onClick={() => handleThemeSelect('Star Wars')}
            className={`h-24 rounded border-2 text-center flex flex-col justify-center items-center transition-all ${
              selectedTheme === 'Star Wars' 
                ? 'border-yellow-400 bg-yellow-600 text-white' 
                : 'border-blue-600 bg-blue-900 text-white hover:bg-blue-800'
            } cursor-pointer`}
            data-testid="theme-starwars"
          >
            <div className="text-lg mb-1">⭐</div>
            <div className="text-xs font-bold uppercase tracking-wide">
              Star Wars
            </div>
          </button>
          
          {/* Marvel */}
          <button
            onClick={() => handleThemeSelect('Marvel')}
            className={`h-24 rounded border-2 text-center flex flex-col justify-center items-center transition-all ${
              selectedTheme === 'Marvel' 
                ? 'border-yellow-400 bg-yellow-600 text-white' 
                : 'border-blue-600 bg-blue-900 text-white hover:bg-blue-800'
            } cursor-pointer`}
            data-testid="theme-marvel"
          >
            <div className="text-lg mb-1">🦸</div>
            <div className="text-xs font-bold uppercase tracking-wide">
              Marvel
            </div>
          </button>
          
          {/* Harry Potter */}
          <button
            onClick={() => handleThemeSelect('Harry Potter')}
            className={`h-24 rounded border-2 text-center flex flex-col justify-center items-center transition-all ${
              selectedTheme === 'Harry Potter' 
                ? 'border-yellow-400 bg-yellow-600 text-white' 
                : 'border-blue-600 bg-blue-900 text-white hover:bg-blue-800'
            } cursor-pointer`}
            data-testid="theme-harrypotter"
          >
            <div className="text-lg mb-1">⚡</div>
            <div className="text-xs font-bold uppercase tracking-wide">
              Harry Potter
            </div>
          </button>
          
          {/* Fast & Furious */}
          <button
            onClick={() => handleThemeSelect('Fast & Furious')}
            className={`h-24 rounded border-2 text-center flex flex-col justify-center items-center transition-all ${
              selectedTheme === 'Fast & Furious' 
                ? 'border-yellow-400 bg-yellow-600 text-white' 
                : 'border-blue-600 bg-blue-900 text-white hover:bg-blue-800'
            } cursor-pointer`}
            data-testid="theme-fastfurious"
          >
            <div className="text-lg mb-1">🏎️</div>
            <div className="text-xs font-bold uppercase tracking-wide">
              Fast & Furious
            </div>
          </button>
        </div>
      </div>
      
      {/* Video Games Section */}
      <div className="px-8 mb-8" style={{ 
        backgroundColor: 'rgb(34, 78, 34)',
        backgroundImage: 'linear-gradient(rgba(70, 120, 70, 0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(70, 120, 70, 0.6) 1px, transparent 1px)',
        backgroundSize: '20px 20px'
      }}>
        <h2 className="text-lg font-bold uppercase tracking-wide text-center mb-6" style={{ color: 'rgb(200, 220, 140)' }}>
          Video Games
        </h2>
        <div className="grid grid-cols-4 gap-6 max-w-4xl mx-auto">
          {/* Zelda */}
          <button
            onClick={() => handleThemeSelect('Zelda')}
            className={`h-24 rounded border-2 text-center flex flex-col justify-center items-center transition-all ${
              selectedTheme === 'Zelda' 
                ? 'border-yellow-400 bg-yellow-600 text-white' 
                : 'border-blue-600 bg-blue-900 text-white hover:bg-blue-800'
            } cursor-pointer`}
            data-testid="theme-zelda"
          >
            <div className="text-lg mb-1">🗡️</div>
            <div className="text-xs font-bold uppercase tracking-wide">
              Zelda
            </div>
          </button>
          
          {/* Red Dead Redemption */}
          <button
            onClick={() => handleThemeSelect('Red Dead Redemption')}
            className={`h-24 rounded border-2 text-center flex flex-col justify-center items-center transition-all ${
              selectedTheme === 'Red Dead Redemption' 
                ? 'border-yellow-400 bg-yellow-600 text-white' 
                : 'border-blue-600 bg-blue-900 text-white hover:bg-blue-800'
            } cursor-pointer`}
            data-testid="theme-rdr"
          >
            <div className="text-lg mb-1">🤠</div>
            <div className="text-xs font-bold uppercase tracking-wide">
              Red Dead Redemption
            </div>
          </button>
          
          {/* Megaman */}
          <button
            onClick={() => handleThemeSelect('Megaman')}
            className={`h-24 rounded border-2 text-center flex flex-col justify-center items-center transition-all ${
              selectedTheme === 'Megaman' 
                ? 'border-yellow-400 bg-yellow-600 text-white' 
                : 'border-blue-600 bg-blue-900 text-white hover:bg-blue-800'
            } cursor-pointer`}
            data-testid="theme-megaman"
          >
            <div className="text-lg mb-1">🤖</div>
            <div className="text-xs font-bold uppercase tracking-wide">
              Megaman
            </div>
          </button>
          
          {/* Final Fantasy */}
          <button
            onClick={() => handleThemeSelect('Final Fantasy')}
            className={`h-24 rounded border-2 text-center flex flex-col justify-center items-center transition-all ${
              selectedTheme === 'Final Fantasy' 
                ? 'border-yellow-400 bg-yellow-600 text-white' 
                : 'border-blue-600 bg-blue-900 text-white hover:bg-blue-800'
            } cursor-pointer`}
            data-testid="theme-ff"
          >
            <div className="text-lg mb-1">⚔️</div>
            <div className="text-xs font-bold uppercase tracking-wide">
              Final Fantasy
            </div>
          </button>
        </div>
      </div>
      
      {/* TV Shows Section */}
      <div className="px-8 mb-8" style={{ 
        backgroundColor: 'rgb(34, 78, 34)',
        backgroundImage: 'linear-gradient(rgba(70, 120, 70, 0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(70, 120, 70, 0.6) 1px, transparent 1px)',
        backgroundSize: '20px 20px'
      }}>
        <h2 className="text-lg font-bold uppercase tracking-wide text-center mb-6" style={{ color: 'rgb(200, 220, 140)' }}>
          TV Shows
        </h2>
        <div className="grid grid-cols-4 gap-6 max-w-4xl mx-auto">
          {/* Friends */}
          <button
            onClick={() => handleThemeSelect('Friends')}
            className={`h-24 rounded border-2 text-center flex flex-col justify-center items-center transition-all ${
              selectedTheme === 'Friends' 
                ? 'border-yellow-400 bg-yellow-600 text-white' 
                : 'border-blue-600 bg-blue-900 text-white hover:bg-blue-800'
            } cursor-pointer`}
            data-testid="theme-friends"
          >
            <div className="text-lg mb-1">☕</div>
            <div className="text-xs font-bold uppercase tracking-wide">
              Friends
            </div>
          </button>
          
          {/* Game of Thrones */}
          <button
            onClick={() => handleThemeSelect('Game of Thrones')}
            className={`h-24 rounded border-2 text-center flex flex-col justify-center items-center transition-all ${
              selectedTheme === 'Game of Thrones' 
                ? 'border-yellow-400 bg-yellow-600 text-white' 
                : 'border-blue-600 bg-blue-900 text-white hover:bg-blue-800'
            } cursor-pointer`}
            data-testid="theme-got"
          >
            <div className="text-lg mb-1">🐉</div>
            <div className="text-xs font-bold uppercase tracking-wide">
              Game of Thrones
            </div>
          </button>
          
          {/* The Office */}
          <button
            onClick={() => handleThemeSelect('The Office')}
            className={`h-24 rounded border-2 text-center flex flex-col justify-center items-center transition-all ${
              selectedTheme === 'The Office' 
                ? 'border-yellow-400 bg-yellow-600 text-white' 
                : 'border-blue-600 bg-blue-900 text-white hover:bg-blue-800'
            } cursor-pointer`}
            data-testid="theme-office"
          >
            <div className="text-lg mb-1">📄</div>
            <div className="text-xs font-bold uppercase tracking-wide">
              The Office
            </div>
          </button>
          
          {/* Breaking Bad */}
          <button
            onClick={() => handleThemeSelect('Breaking Bad')}
            className={`h-24 rounded border-2 text-center flex flex-col justify-center items-center transition-all ${
              selectedTheme === 'Breaking Bad' 
                ? 'border-yellow-400 bg-yellow-600 text-white' 
                : 'border-blue-600 bg-blue-900 text-white hover:bg-blue-800'
            } cursor-pointer`}
            data-testid="theme-breakingbad"
          >
            <div className="text-lg mb-1">🧪</div>
            <div className="text-xs font-bold uppercase tracking-wide">
              Breaking Bad
            </div>
          </button>
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="text-center pb-8 space-y-4">
        {selectedTheme && (
          <div className="mb-4">
            <button
              onClick={handleProceedToSimulation}
              disabled={validationLoading}
              className={`py-3 px-8 rounded text-sm font-bold transition-colors ${
                validationLoading
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : isConnected
                  ? 'bg-green-600 text-white hover:bg-green-500'
                  : 'bg-yellow-600 text-white hover:bg-yellow-500'
              }`}
              data-testid="button-proceed"
            >
              {validationLoading 
                ? 'Checking Connection...' 
                : isConnected 
                ? 'Start Simulation Setup' 
                : 'Connect HubSpot & Continue'
              }
            </button>
            {!isConnected && !validationLoading && (
              <div className="text-xs mt-2" style={{ color: 'rgb(180, 200, 120)' }}>
                HubSpot connection required for simulation
              </div>
            )}
          </div>
        )}
        
        <button
          onClick={() => setLocation('/hubspot-setup')}
          className="text-xs underline hover:opacity-75 transition-opacity"
          style={{ color: 'rgb(180, 200, 120)' }}
          data-testid="button-back"
        >
          Back to HubSpot Setup
        </button>
      </div>
    </div>
  );
}