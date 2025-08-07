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

    // Proceed to simulation setup (when implemented)
    toast({
      title: "Proceeding to Simulation",
      description: "Simulation setup coming soon!",
    });
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
          {/* Rock - Available */}
          <button
            onClick={() => handleThemeSelect('Rock')}
            className={`h-24 rounded border-2 text-center flex flex-col justify-center items-center transition-all ${
              selectedTheme === 'Rock' 
                ? 'border-yellow-400 bg-yellow-600 text-white' 
                : 'border-blue-600 bg-blue-900 text-white hover:bg-blue-800'
            } cursor-pointer`}
            data-testid="theme-rock"
          >
            <div className="text-lg mb-1">🎸</div>
            <div className="text-xs font-bold uppercase tracking-wide">
              Rock
            </div>
          </button>
          
          {/* Pop - Disabled */}
          <button
            onClick={() => handleThemeSelect('pop')}
            disabled
            className="h-24 rounded border-2 border-green-600 bg-green-800 text-green-400 cursor-not-allowed opacity-60 text-center flex flex-col justify-center items-center transition-all"
            data-testid="theme-pop"
          >
            <div className="text-lg mb-1">🎤</div>
            <div className="text-xs font-bold uppercase tracking-wide">
              Pop
            </div>
          </button>
          
          {/* Jazz - Disabled */}
          <button
            onClick={() => handleThemeSelect('jazz')}
            disabled
            className="h-24 rounded border-2 border-green-600 bg-green-800 text-green-400 cursor-not-allowed opacity-60 text-center flex flex-col justify-center items-center transition-all"
            data-testid="theme-jazz"
          >
            <div className="text-lg mb-1">🎷</div>
            <div className="text-xs font-bold uppercase tracking-wide">
              Jazz
            </div>
          </button>
          
          {/* Electronic - Disabled */}
          <button
            onClick={() => handleThemeSelect('electronic')}
            disabled
            className="h-24 rounded border-2 border-green-600 bg-green-800 text-green-400 cursor-not-allowed opacity-60 text-center flex flex-col justify-center items-center transition-all"
            data-testid="theme-electronic"
          >
            <div className="text-lg mb-1">🎹</div>
            <div className="text-xs font-bold uppercase tracking-wide">
              Electronic
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
          {/* Action - Disabled */}
          <button
            onClick={() => handleThemeSelect('action')}
            disabled
            className="h-24 rounded border-2 border-green-600 bg-green-800 text-green-400 cursor-not-allowed opacity-60 text-center flex flex-col justify-center items-center transition-all"
            data-testid="theme-action"
          >
            <div className="text-lg mb-1">💥</div>
            <div className="text-xs font-bold uppercase tracking-wide">
              Action
            </div>
          </button>
          
          {/* Comedy - Disabled */}
          <button
            onClick={() => handleThemeSelect('comedy')}
            disabled
            className="h-24 rounded border-2 border-green-600 bg-green-800 text-green-400 cursor-not-allowed opacity-60 text-center flex flex-col justify-center items-center transition-all"
            data-testid="theme-comedy"
          >
            <div className="text-lg mb-1">😂</div>
            <div className="text-xs font-bold uppercase tracking-wide">
              Comedy
            </div>
          </button>
          
          {/* Drama - Disabled */}
          <button
            onClick={() => handleThemeSelect('drama')}
            disabled
            className="h-24 rounded border-2 border-green-600 bg-green-800 text-green-400 cursor-not-allowed opacity-60 text-center flex flex-col justify-center items-center transition-all"
            data-testid="theme-drama"
          >
            <div className="text-lg mb-1">🎭</div>
            <div className="text-xs font-bold uppercase tracking-wide">
              Drama
            </div>
          </button>
          
          {/* Sci-Fi - Disabled */}
          <button
            onClick={() => handleThemeSelect('scifi')}
            disabled
            className="h-24 rounded border-2 border-green-600 bg-green-800 text-green-400 cursor-not-allowed opacity-60 text-center flex flex-col justify-center items-center transition-all"
            data-testid="theme-scifi"
          >
            <div className="text-lg mb-1">🚀</div>
            <div className="text-xs font-bold uppercase tracking-wide">
              Sci-Fi
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
          {/* RPG - Disabled */}
          <button
            onClick={() => handleThemeSelect('rpg')}
            disabled
            className="h-24 rounded border-2 border-green-600 bg-green-800 text-green-400 cursor-not-allowed opacity-60 text-center flex flex-col justify-center items-center transition-all"
            data-testid="theme-rpg"
          >
            <div className="text-lg mb-1">⚔️</div>
            <div className="text-xs font-bold uppercase tracking-wide">
              RPG
            </div>
          </button>
          
          {/* Shooter - Disabled */}
          <button
            onClick={() => handleThemeSelect('shooter')}
            disabled
            className="h-24 rounded border-2 border-green-600 bg-green-800 text-green-400 cursor-not-allowed opacity-60 text-center flex flex-col justify-center items-center transition-all"
            data-testid="theme-shooter"
          >
            <div className="text-lg mb-1">🔫</div>
            <div className="text-xs font-bold uppercase tracking-wide">
              Shooter
            </div>
          </button>
          
          {/* Racing - Disabled */}
          <button
            onClick={() => handleThemeSelect('racing')}
            disabled
            className="h-24 rounded border-2 border-green-600 bg-green-800 text-green-400 cursor-not-allowed opacity-60 text-center flex flex-col justify-center items-center transition-all"
            data-testid="theme-racing"
          >
            <div className="text-lg mb-1">🏎️</div>
            <div className="text-xs font-bold uppercase tracking-wide">
              Racing
            </div>
          </button>
          
          {/* Strategy - Disabled */}
          <button
            onClick={() => handleThemeSelect('strategy')}
            disabled
            className="h-24 rounded border-2 border-green-600 bg-green-800 text-green-400 cursor-not-allowed opacity-60 text-center flex flex-col justify-center items-center transition-all"
            data-testid="theme-strategy"
          >
            <div className="text-lg mb-1">♟️</div>
            <div className="text-xs font-bold uppercase tracking-wide">
              Strategy
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
          {/* Crime - Disabled */}
          <button
            onClick={() => handleThemeSelect('crime')}
            disabled
            className="h-24 rounded border-2 border-green-600 bg-green-800 text-green-400 cursor-not-allowed opacity-60 text-center flex flex-col justify-center items-center transition-all"
            data-testid="theme-crime"
          >
            <div className="text-lg mb-1">🔍</div>
            <div className="text-xs font-bold uppercase tracking-wide">
              Crime
            </div>
          </button>
          
          {/* Sitcom - Disabled */}
          <button
            onClick={() => handleThemeSelect('sitcom')}
            disabled
            className="h-24 rounded border-2 border-green-600 bg-green-800 text-green-400 cursor-not-allowed opacity-60 text-center flex flex-col justify-center items-center transition-all"
            data-testid="theme-sitcom"
          >
            <div className="text-lg mb-1">📺</div>
            <div className="text-xs font-bold uppercase tracking-wide">
              Sitcom
            </div>
          </button>
          
          {/* Reality - Disabled */}
          <button
            onClick={() => handleThemeSelect('reality')}
            disabled
            className="h-24 rounded border-2 border-green-600 bg-green-800 text-green-400 cursor-not-allowed opacity-60 text-center flex flex-col justify-center items-center transition-all"
            data-testid="theme-reality"
          >
            <div className="text-lg mb-1">🎬</div>
            <div className="text-xs font-bold uppercase tracking-wide">
              Reality
            </div>
          </button>
          
          {/* Documentary - Disabled */}
          <button
            onClick={() => handleThemeSelect('documentary')}
            disabled
            className="h-24 rounded border-2 border-green-600 bg-green-800 text-green-400 cursor-not-allowed opacity-60 text-center flex flex-col justify-center items-center transition-all"
            data-testid="theme-documentary"
          >
            <div className="text-lg mb-1">📽️</div>
            <div className="text-xs font-bold uppercase tracking-wide">
              Documentary
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