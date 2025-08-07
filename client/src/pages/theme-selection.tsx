import { useState } from 'react';
import { useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useSession } from '@/hooks/use-session';

const themes = [
  { id: 'music', name: 'Music Industry', icon: '♪', description: 'Record labels, artists, venues' },
  { id: 'movies', name: 'Film & TV', icon: '🎬', description: 'Studios, actors, productions' },
  { id: 'games', name: 'Video Games', icon: '🎮', description: 'Developers, publishers, players' },
  { id: 'saas', name: 'SaaS Business', icon: '💻', description: 'Software companies, subscriptions' }
];

export default function ThemeSelection() {
  const [, setLocation] = useLocation();
  const [selectedTheme, setSelectedTheme] = useState<string>('');
  const { toast } = useToast();
  const { user } = useSession();

  const saveThemeMutation = useMutation({
    mutationFn: async (theme: string) => {
      if (!user?.id) throw new Error('User not authenticated');
      return apiRequest('PUT', `/api/session/${user.id}`, {
        selectedTheme: theme
      });
    },
    onSuccess: async () => {
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: ['/api/session', user.id] });
      }
      
      toast({
        title: "Theme Selected",
        description: "Proceeding to industry selection...",
      });
      
      setLocation('/industry-selection');
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save theme selection",
        variant: "destructive",
      });
    },
  });

  const handleThemeSelect = (themeId: string) => {
    setSelectedTheme(themeId);
  };

  const handleContinue = () => {
    if (!selectedTheme) {
      toast({
        title: "No Theme Selected",
        description: "Please choose a theme to continue",
        variant: "destructive",
      });
      return;
    }
    saveThemeMutation.mutate(selectedTheme);
  };

  return (
    <div className="min-h-screen bg-gray-200 flex flex-col items-center justify-center font-gameboy"
         style={{
           backgroundImage: `
             linear-gradient(to right, rgba(176, 176, 176, 0.3) 1px, transparent 1px),
             linear-gradient(to bottom, rgba(176, 176, 176, 0.3) 1px, transparent 1px)
           `,
           backgroundSize: '16px 16px'
         }}>
      
      {/* SimCRM. Title */}
      <div className="mb-8">
        <h1 className="text-3xl tracking-wider">
          <span style={{ color: '#000782' }}>SimCRM</span>
          <span className="text-red-800">.</span>
        </h1>
      </div>
      
      {/* Main Console Frame */}
      <div className="bg-gray-500 p-6 relative"
           style={{ 
             background: 'linear-gradient(145deg, #8A8A8A, #6A6A6A)',
             width: '700px',
             height: '500px',
             borderBottomRightRadius: '70px',
             borderTopRightRadius: '20px',
             borderTopLeftRadius: '20px',
             borderBottomLeftRadius: '20px'
           }}>
        
        {/* Game Boy Screen */}
        <div className="bg-yellow-500 p-8" 
             style={{ 
               backgroundColor: 'rgb(155, 187, 88)',
               borderRadius: '4px',
               height: '430px',
               display: 'flex',
               flexDirection: 'column',
               justifyContent: 'center',
               margin: 'auto',
               width: '600px',
               boxShadow: 'inset 4px 4px 5px 0px #444'
             }}>
          
          {/* Header */}
          <div className="text-center mb-6">
            <h2 className="text-green-900 text-lg font-bold uppercase tracking-wide mb-2">
              Choose Your Theme
            </h2>
            <div className="text-green-800 text-sm">
              Select the business theme for your CRM simulation
            </div>
          </div>
          
          {/* Theme Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {themes.map((theme) => (
              <button
                key={theme.id}
                onClick={() => handleThemeSelect(theme.id)}
                className={`p-4 rounded border-2 transition-all ${
                  selectedTheme === theme.id
                    ? 'border-green-800 bg-green-200'
                    : 'border-green-700 bg-green-100 hover:bg-green-150'
                }`}
                style={{ 
                  backgroundColor: selectedTheme === theme.id ? '#A8C090' : '#C8E0B0',
                }}
                data-testid={`theme-${theme.id}`}
              >
                <div className="text-2xl mb-2">{theme.icon}</div>
                <div className="text-green-900 font-bold text-sm mb-1">{theme.name}</div>
                <div className="text-green-800 text-xs">{theme.description}</div>
              </button>
            ))}
          </div>
          
          {/* Continue Button */}
          <div className="text-center">
            <button
              onClick={handleContinue}
              disabled={!selectedTheme || saveThemeMutation.isPending}
              className="bg-red-800 text-white py-3 px-8 rounded text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-50"
              data-testid="button-continue"
            >
              {saveThemeMutation.isPending ? 'SAVING...' : 'CONTINUE'}
            </button>
          </div>
          
          {/* Back Button */}
          <div className="text-center mt-4">
            <button
              onClick={() => setLocation('/profile')}
              className="text-green-700 text-xs underline hover:text-green-600"
              data-testid="button-back"
            >
              Back to Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}