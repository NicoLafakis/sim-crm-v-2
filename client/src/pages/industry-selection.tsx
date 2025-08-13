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
    { id: 'saas', name: 'SaaS', icon: '💻' },
    { id: 'ecommerce', name: 'E-commerce', icon: '🛒' },
    { id: 'healthcare', name: 'Healthcare', icon: '🏥' },
    { id: 'finance', name: 'Finance', icon: '💰' },
    { id: 'education', name: 'Education', icon: '📚' },
    { id: 'realestate', name: 'Real Estate', icon: '🏠' },
    { id: 'consulting', name: 'Consulting', icon: '📊' },
    { id: 'manufacturing', name: 'Manufacturing', icon: '🏭' },
    { id: 'retail', name: 'Retail', icon: '🏪' },
    { id: 'nonprofit', name: 'Non-Profit', icon: '🤝' },
    { id: 'salon', name: 'Salon/Spa', icon: '💇' },
    { id: 'lawfirm', name: 'Law Firm', icon: '⚖️' },
  ];

  const updateSessionMutation = useMutation({
    mutationFn: async (industry: string) => {
      if (!user?.id) throw new Error('No user ID');
      return apiRequest('PUT', `/api/session/${user.id}`, {
        selectedIndustry: industry
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/session/${user?.id}`] });
    }
  });

  const handleIndustrySelect = async (industry: string) => {
    setSelectedIndustry(industry);
    
    try {
      await updateSessionMutation.mutateAsync(industry);
      // Auto-navigate after selection
      setTimeout(() => {
        setLocation('/record-frequency');
      }, 500);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save industry selection",
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
              const isEcommerce = industry.id === 'ecommerce';
              const isDisabled = !isEcommerce;
              
              return (
                <button
                  key={industry.id}
                  onClick={() => isEcommerce ? handleIndustrySelect(industry.id) : null}
                  disabled={isDisabled}
                  className="h-20 rounded border-2 text-center flex flex-col justify-center items-center transition-all"
                  style={selectedIndustry === industry.id 
                    ? { borderColor: '#8b0000', backgroundColor: '#8b0000', color: 'white', cursor: 'pointer' }
                    : isEcommerce
                      ? { borderColor: '#6c7b7f', backgroundColor: '#6c7b7f', color: '#9fb89f', cursor: 'pointer' }
                      : { borderColor: '#6c7b7f', backgroundColor: '#6c7b7f', color: '#9fb89f', cursor: 'not-allowed', opacity: 0.5 }
                  }
                  data-testid={`industry-${industry.id}`}
                >
                  <div className="text-lg mb-1">{industry.icon}</div>
                  <div className="text-xs font-bold uppercase tracking-wide">
                    {industry.name}
                    {isDisabled && <div className="text-xs mt-1">(Coming Soon)</div>}
                  </div>
                </button>
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