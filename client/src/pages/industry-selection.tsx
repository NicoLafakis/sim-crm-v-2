import { useState } from 'react';
import { useLocation } from 'wouter';
import { useSession } from '@/hooks/use-session';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';

export default function IndustrySelection() {
  const [, setLocation] = useLocation();
  const [selectedIndustry, setSelectedIndustry] = useState<string>('');
  const { toast } = useToast();
  const { user, session } = useSession();

  const industries = [
    { id: 'demo', name: 'Demo Mode', icon: '🎮', enabled: true, description: '1 hour quick demo' },
    { id: 'ecommerce', name: 'E-commerce', icon: '🛒', enabled: true, description: '90 day simulation' },
    { id: 'saas', name: 'SaaS', icon: '💻', enabled: false },
    { id: 'healthcare', name: 'Healthcare', icon: '🏥', enabled: false },
    { id: 'finance', name: 'Finance', icon: '💰', enabled: false },
    { id: 'education', name: 'Education', icon: '📚', enabled: false },
    { id: 'realestate', name: 'Real Estate', icon: '🏠', enabled: false },
    { id: 'consulting', name: 'Consulting', icon: '📊', enabled: false },
    { id: 'manufacturing', name: 'Manufacturing', icon: '🏭', enabled: false },
    { id: 'retail', name: 'Retail', icon: '🏪', enabled: false },
    { id: 'nonprofit', name: 'Non-Profit', icon: '🤝', enabled: false },
    { id: 'salon', name: 'Salon/Spa', icon: '💇', enabled: false },
  ];

  const updateSessionMutation = useMutation({
    mutationFn: async (industry: string) => {
      if (!user?.id) throw new Error('No user ID');
      return apiRequest('PUT', `/api/session/${user.id}`, {
        selectedIndustry: industry
      });
    },
    onSuccess: async () => {
      // Invalidate React Query cache
      queryClient.invalidateQueries({ queryKey: [`/api/session/${user?.id}`] });
      
      // Refetch and update Zustand session state
      if (user?.id) {
        try {
          const response = await apiRequest('GET', `/api/session/${user.id}`);
          const updatedSession = await response.json();
          const { setSession } = useSession.getState();
          setSession(updatedSession);
        } catch (error) {
          console.warn('Failed to update session state after industry selection:', error);
        }
      }
    }
  });

  const handleIndustrySelect = async (industry: string) => {
    if (!industry || industry.trim() === '') {
      console.error('Invalid industry selected:', industry);
      toast({
        title: "Invalid Industry",
        description: "Please select a valid industry.",
        variant: "destructive"
      });
      return;
    }

    setSelectedIndustry(industry);
    console.log('Industry selected:', industry, 'for user:', user?.id);
    
    try {
      // Block navigation until session save completes
      await updateSessionMutation.mutateAsync(industry);
      
      console.log('Industry saved successfully, navigating to record frequency');
      
      // Navigate immediately after successful save
      setLocation('/record-frequency');
    } catch (error) {
      console.error('Industry save failed:', error);
      setSelectedIndustry(''); // Reset selection on failure
      toast({
        title: "Industry Save Failed", 
        description: "Failed to save your industry selection. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleContinue = () => {
    if (!selectedIndustry) {
      toast({
        title: "Industry Required",
        description: "Please select an industry to continue",
        variant: "destructive",
      });
      return;
    }

    // Save to session and continue to frequency selection
    setLocation('/record-frequency');
  };

  if (!user) {
    return null; // Will redirect to login
  }

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
          🏢 Industry Selection
        </h1>
        <div className="text-sm mb-2" style={{ color: '#1e3a5f' }}>
          Choose your business industry for simulation context
        </div>
        <div className="text-xs" style={{ color: '#6c7b7f' }}>
          Player: {user.username} | Tier: {user.playerTier} | Credits: {user.creditLimit}
        </div>
        {session?.selectedTheme && (
          <div className="text-xs mt-1" style={{ color: '#6c7b7f' }}>
            Theme: {session.selectedTheme}
          </div>
        )}
      </div>
      
      {/* Main Content */}
      <div className="px-8 pb-8">
        <div className="max-w-4xl mx-auto">
          
          {/* Industries Grid */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            {industries.map((industry) => {
              const isEnabled = industry.enabled !== false;
              
              return (
                <div key={industry.id} className="relative group">
                  <button
                    onClick={() => isEnabled ? handleIndustrySelect(industry.id) : null}
                    disabled={!isEnabled}
                    className="h-20 w-full rounded border-2 text-center flex flex-col justify-center items-center transition-all"
                    style={selectedIndustry === industry.id 
                      ? { borderColor: '#8b0000', backgroundColor: '#8b0000', color: 'white', cursor: 'pointer' }
                      : isEnabled
                        ? { borderColor: '#6c7b7f', backgroundColor: '#6c7b7f', color: '#9fb89f', cursor: 'pointer' }
                      : { borderColor: '#6c7b7f', backgroundColor: '#6c7b7f', color: '#9fb89f', cursor: 'not-allowed', opacity: 0.5 }
                  }
                  data-testid={`industry-${industry.id}`}
                >
                  <div className="text-lg mb-1">{industry.icon}</div>
                  <div className="text-xs font-bold uppercase tracking-wide">
                    {industry.name}
                  </div>
                  {industry.description && (
                    <div className="text-xs mt-1" style={{ fontSize: '10px' }}>
                      {industry.description}
                    </div>
                  )}
                </button>
                
                {/* Tooltip for disabled items */}
                {!isEnabled && (
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <div className="bg-black text-white text-xs px-2 py-1 rounded">
                      Coming Soon
                    </div>
                  </div>
                )}
              </div>
              );
            })}
          </div>

          {/* Control Buttons */}
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => setLocation('/theme-selection')}
              className="px-6 py-2 transition-all"
              style={{ 
                color: '#1e3a5f',
                textDecoration: 'underline',
                fontFamily: 'Quantico',
                fontSize: '0.75rem',
                lineHeight: '1rem',
                height: '1rem'
              }}
              data-testid="button-back"
            >
              ← Back To Themes
            </button>
            
            <button
              onClick={handleContinue}
              disabled={!selectedIndustry}
              className="px-8 py-3 rounded border-2 font-bold uppercase tracking-wide text-sm transition-all"
              style={selectedIndustry
                ? { borderColor: '#8b0000', backgroundColor: '#8b0000', color: 'white', cursor: 'pointer' }
                : { borderColor: '#6c7b7f', backgroundColor: '#6c7b7f', color: '#9fb89f', cursor: 'not-allowed' }
              }
              data-testid="button-continue"
            >
              Continue to Frequency Setup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}