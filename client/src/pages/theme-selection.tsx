import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { useSession } from '@/hooks/use-session';
import { useHubSpotValidation } from '@/hooks/use-hubspot-validation';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';

export default function ThemeSelection() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useSession();
  const { isConnected, isLoading: validationLoading } = useHubSpotValidation();
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);

  const updateSessionMutation = useMutation({
    mutationFn: async (theme: string) => {
      if (!user?.id) throw new Error('No user ID');
      return apiRequest('PUT', `/api/session/${user.id}`, {
        selectedTheme: theme
      });
    },
    onSuccess: async () => {
      // Invalidate React Query cache
      queryClient.invalidateQueries({ queryKey: [`/api/session/${user?.id}`] });
      
      // Refetch and update Zustand session state
      if (user?.id) {
        try {
          const updatedSession = await apiRequest('GET', `/api/session/${user.id}`);
          const { setSession } = useSession.getState();
          setSession(updatedSession);
        } catch (error) {
          console.warn('Failed to update session state after theme selection:', error);
        }
      }
    }
  });

  const handleThemeSelect = async (themeId: string) => {
    setSelectedTheme(themeId);
    
    try {
      await updateSessionMutation.mutateAsync(themeId);
      // Auto-navigate after selection
      setTimeout(() => {
        setLocation('/industry-selection');
      }, 500);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save theme selection",
        variant: "destructive"
      });
    }
  };

  const handleProceedToSimulation = () => {
    if (!selectedTheme) {
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
    setLocation('/industry-selection');
  };

  return (
    <div className="min-h-screen font-gameboy" 
         style={{ 
           backgroundColor: '#e8e8e8',
           backgroundImage: `
             linear-gradient(to right, rgba(176, 176, 176, 0.3) 1px, transparent 1px),
             linear-gradient(to bottom, rgba(176, 176, 176, 0.3) 1px, transparent 1px)
           `,
           backgroundSize: '16px 16px'
         }}>
      
      {/* Header */}
      <div className="text-center pt-8 pb-6">
        <h1 className="text-2xl font-bold uppercase tracking-wider mb-2" style={{ color: '#1e3a5f' }}>
          Select a Theme
        </h1>
      </div>
      
      {/* Music Section */}
      <div className="px-8 mb-8">
        <h2 className="text-lg font-bold uppercase tracking-wide text-center mb-6" style={{ color: '#1e3a5f' }}>
          Music
        </h2>
        <div className="grid grid-cols-4 gap-6 max-w-4xl mx-auto">
          {/* Beatles */}
          <button
            onClick={() => handleThemeSelect('Beatles')}
            className={`h-24 rounded border-2 text-center flex flex-col justify-center items-center transition-all cursor-pointer`}
            style={selectedTheme === 'Beatles' 
              ? { borderColor: '#8b0000', backgroundColor: '#8b0000', color: 'white' }
              : { borderColor: '#6c7b7f', backgroundColor: '#6c7b7f', color: '#9fb89f' }
            }
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
            className={`h-24 rounded border-2 text-center flex flex-col justify-center items-center transition-all cursor-pointer`}
            style={selectedTheme === 'Madonna' 
              ? { borderColor: '#8b0000', backgroundColor: '#8b0000', color: 'white' }
              : { borderColor: '#6c7b7f', backgroundColor: '#6c7b7f', color: '#9fb89f' }
            }
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
            className={`h-24 rounded border-2 text-center flex flex-col justify-center items-center transition-all cursor-pointer`}
            style={selectedTheme === 'Drake' 
              ? { borderColor: '#8b0000', backgroundColor: '#8b0000', color: 'white' }
              : { borderColor: '#6c7b7f', backgroundColor: '#6c7b7f', color: '#9fb89f' }
            }
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
            className={`h-24 rounded border-2 text-center flex flex-col justify-center items-center transition-all cursor-pointer`}
            style={selectedTheme === 'Daft Punk' 
              ? { borderColor: '#8b0000', backgroundColor: '#8b0000', color: 'white' }
              : { borderColor: '#6c7b7f', backgroundColor: '#6c7b7f', color: '#9fb89f' }
            }
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
      <div className="px-8 mb-8">
        <h2 className="text-lg font-bold uppercase tracking-wide text-center mb-6" style={{ color: '#1e3a5f' }}>
          Movies
        </h2>
        <div className="grid grid-cols-4 gap-6 max-w-4xl mx-auto">
          {/* Star Wars */}
          <button
            onClick={() => handleThemeSelect('Star Wars')}
            className="h-24 rounded border-2 text-center flex flex-col justify-center items-center transition-all cursor-pointer"
            style={selectedTheme === 'Star Wars' 
              ? { borderColor: '#8b0000', backgroundColor: '#8b0000', color: 'white' }
              : { borderColor: '#6c7b7f', backgroundColor: '#6c7b7f', color: '#9fb89f' }
            }
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
            className="h-24 rounded border-2 text-center flex flex-col justify-center items-center transition-all cursor-pointer"
            style={selectedTheme === 'Marvel' 
              ? { borderColor: '#8b0000', backgroundColor: '#8b0000', color: 'white' }
              : { borderColor: '#6c7b7f', backgroundColor: '#6c7b7f', color: '#9fb89f' }
            }
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
            className="h-24 rounded border-2 text-center flex flex-col justify-center items-center transition-all cursor-pointer"
            style={selectedTheme === 'Harry Potter' 
              ? { borderColor: '#8b0000', backgroundColor: '#8b0000', color: 'white' }
              : { borderColor: '#6c7b7f', backgroundColor: '#6c7b7f', color: '#9fb89f' }
            }
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
            className="h-24 rounded border-2 text-center flex flex-col justify-center items-center transition-all cursor-pointer"
            style={selectedTheme === 'Fast & Furious' 
              ? { borderColor: '#8b0000', backgroundColor: '#8b0000', color: 'white' }
              : { borderColor: '#6c7b7f', backgroundColor: '#6c7b7f', color: '#9fb89f' }
            }
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
      <div className="px-8 mb-8">
        <h2 className="text-lg font-bold uppercase tracking-wide text-center mb-6" style={{ color: '#1e3a5f' }}>
          Video Games
        </h2>
        <div className="grid grid-cols-4 gap-6 max-w-4xl mx-auto">
          {/* Zelda */}
          <button
            onClick={() => handleThemeSelect('Zelda')}
            className="h-24 rounded border-2 text-center flex flex-col justify-center items-center transition-all cursor-pointer"
            style={selectedTheme === 'Zelda' 
              ? { borderColor: '#8b0000', backgroundColor: '#8b0000', color: 'white' }
              : { borderColor: '#6c7b7f', backgroundColor: '#6c7b7f', color: '#9fb89f' }
            }
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
            className="h-24 rounded border-2 text-center flex flex-col justify-center items-center transition-all cursor-pointer"
            style={selectedTheme === 'Red Dead Redemption' 
              ? { borderColor: '#8b0000', backgroundColor: '#8b0000', color: 'white' }
              : { borderColor: '#6c7b7f', backgroundColor: '#6c7b7f', color: '#9fb89f' }
            }
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
            className="h-24 rounded border-2 text-center flex flex-col justify-center items-center transition-all cursor-pointer"
            style={selectedTheme === 'Megaman' 
              ? { borderColor: '#8b0000', backgroundColor: '#8b0000', color: 'white' }
              : { borderColor: '#6c7b7f', backgroundColor: '#6c7b7f', color: '#9fb89f' }
            }
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
            className="h-24 rounded border-2 text-center flex flex-col justify-center items-center transition-all cursor-pointer"
            style={selectedTheme === 'Final Fantasy' 
              ? { borderColor: '#8b0000', backgroundColor: '#8b0000', color: 'white' }
              : { borderColor: '#6c7b7f', backgroundColor: '#6c7b7f', color: '#9fb89f' }
            }
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
      <div className="px-8 mb-8">
        <h2 className="text-lg font-bold uppercase tracking-wide text-center mb-6" style={{ color: '#1e3a5f' }}>
          TV Shows
        </h2>
        <div className="grid grid-cols-4 gap-6 max-w-4xl mx-auto">
          {/* Friends */}
          <button
            onClick={() => handleThemeSelect('Friends')}
            className="h-24 rounded border-2 text-center flex flex-col justify-center items-center transition-all cursor-pointer"
            style={selectedTheme === 'Friends' 
              ? { borderColor: '#8b0000', backgroundColor: '#8b0000', color: 'white' }
              : { borderColor: '#6c7b7f', backgroundColor: '#6c7b7f', color: '#9fb89f' }
            }
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
            className="h-24 rounded border-2 text-center flex flex-col justify-center items-center transition-all cursor-pointer"
            style={selectedTheme === 'Game of Thrones' 
              ? { borderColor: '#8b0000', backgroundColor: '#8b0000', color: 'white' }
              : { borderColor: '#6c7b7f', backgroundColor: '#6c7b7f', color: '#9fb89f' }
            }
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
            className="h-24 rounded border-2 text-center flex flex-col justify-center items-center transition-all cursor-pointer"
            style={selectedTheme === 'The Office' 
              ? { borderColor: '#8b0000', backgroundColor: '#8b0000', color: 'white' }
              : { borderColor: '#6c7b7f', backgroundColor: '#6c7b7f', color: '#9fb89f' }
            }
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
            className="h-24 rounded border-2 text-center flex flex-col justify-center items-center transition-all cursor-pointer"
            style={selectedTheme === 'Breaking Bad' 
              ? { borderColor: '#8b0000', backgroundColor: '#8b0000', color: 'white' }
              : { borderColor: '#6c7b7f', backgroundColor: '#6c7b7f', color: '#9fb89f' }
            }
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
              className="py-3 px-8 rounded text-sm font-bold transition-colors"
              style={validationLoading
                ? { backgroundColor: '#6c7b7f', color: '#9fb89f', cursor: 'not-allowed' }
                : isConnected
                ? { backgroundColor: '#8b0000', color: 'white', cursor: 'pointer' }
                : { backgroundColor: '#8b0000', color: 'white', cursor: 'pointer' }
              }
              data-testid="button-proceed"
            >
              {validationLoading 
                ? 'Checking Connection...' 
                : isConnected 
                ? 'Continue to Industry Selection' 
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
          className="px-6 py-2 transition-all"
          style={{ 
            color: 'rgb(200, 220, 140)',
            textDecoration: 'underline',
            fontFamily: 'Quantico',
            fontSize: '0.75rem',
            lineHeight: '1rem',
            height: '1rem'
          }}
          data-testid="button-back"
        >
          ← Back To HubSpot Setup
        </button>
      </div>
    </div>
  );
}