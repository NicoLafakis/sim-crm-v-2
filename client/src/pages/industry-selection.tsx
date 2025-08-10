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
      toast({
        title: "Industry Selected",
        description: `${industry} industry selected and saved!`,
      });

      // Auto-navigate after selection
      setTimeout(() => {
        setLocation('/record-frequency');
      }, 800);
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
           backgroundColor: 'rgb(34, 78, 34)',
           backgroundImage: 'linear-gradient(rgba(70, 120, 70, 0.45) 1px, transparent 1px), linear-gradient(90deg, rgba(70, 120, 70, 0.45) 1px, transparent 1px)',
           backgroundSize: '20px 20px'
         }}>
      
      {/* Header */}
      <div className="text-center pt-8 pb-6" style={{ 
        backgroundColor: 'rgb(34, 78, 34)',
        backgroundImage: 'linear-gradient(rgba(70, 120, 70, 0.45) 1px, transparent 1px), linear-gradient(90deg, rgba(70, 120, 70, 0.45) 1px, transparent 1px)',
        backgroundSize: '20px 20px'
      }}>
        <h1 className="text-2xl font-bold uppercase tracking-wider mb-2" style={{ color: 'rgb(200, 220, 140)' }}>
          🏢 Industry Selection
        </h1>
        <div className="text-sm mb-2" style={{ color: 'rgb(200, 220, 140)' }}>
          Choose your business industry for simulation context
        </div>
        <div className="text-xs" style={{ color: 'rgb(180, 200, 120)' }}>
          Player: {user.username} | Tier: {user.playerTier} | Credits: {user.creditLimit}
        </div>
        {session?.selectedTheme && (
          <div className="text-xs mt-1" style={{ color: 'rgb(180, 200, 120)' }}>
            Theme: {session.selectedTheme}
          </div>
        )}
      </div>
      
      {/* Main Content */}
      <div className="px-8 pb-8" style={{ 
        backgroundColor: 'rgb(34, 78, 34)',
        backgroundImage: 'linear-gradient(rgba(70, 120, 70, 0.45) 1px, transparent 1px), linear-gradient(90deg, rgba(70, 120, 70, 0.45) 1px, transparent 1px)',
        backgroundSize: '20px 20px'
      }}>
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
                  className={`h-20 rounded border-2 text-center flex flex-col justify-center items-center transition-all ${
                    selectedIndustry === industry.id 
                      ? 'border-yellow-400 bg-yellow-600 text-white' 
                      : isEcommerce
                        ? 'border-blue-600 bg-blue-900 text-white hover:bg-blue-800 cursor-pointer'
                        : 'border-gray-600 bg-gray-700 text-gray-400 cursor-not-allowed opacity-50'
                  }`}
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
                color: 'rgb(200, 220, 140)',
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
              className={`px-8 py-3 rounded border-2 font-bold uppercase tracking-wide text-sm transition-all ${
                selectedIndustry
                  ? 'border-green-400 bg-green-600 text-white hover:bg-green-700 cursor-pointer'
                  : 'border-gray-600 bg-gray-800 text-gray-400 cursor-not-allowed'
              }`}
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