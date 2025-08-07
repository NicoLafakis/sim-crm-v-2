import { useState } from 'react';
import { useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useSession } from '@/hooks/use-session';

const industries = [
  { id: 'salon', name: 'Beauty Salon', description: 'Hair, nails, spa services' },
  { id: 'law-firm', name: 'Law Firm', description: 'Legal services, clients, cases' },
  { id: 'restaurant', name: 'Restaurant', description: 'Dining, catering, delivery' },
  { id: 'fitness', name: 'Fitness Center', description: 'Gym, trainers, memberships' },
  { id: 'consulting', name: 'Consulting', description: 'Advisory, projects, clients' },
  { id: 'real-estate', name: 'Real Estate', description: 'Properties, agents, buyers' }
];

export default function IndustrySelection() {
  const [, setLocation] = useLocation();
  const [selectedIndustry, setSelectedIndustry] = useState<string>('');
  const { toast } = useToast();
  const { user } = useSession();

  const saveIndustryMutation = useMutation({
    mutationFn: async (industry: string) => {
      if (!user?.id) throw new Error('User not authenticated');
      return apiRequest('PUT', `/api/session/${user.id}`, {
        selectedIndustry: industry
      });
    },
    onSuccess: async () => {
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: ['/api/session', user.id] });
      }
      
      toast({
        title: "Industry Selected",
        description: "Proceeding to frequency selection...",
      });
      
      setLocation('/frequency-selection');
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save industry selection",
        variant: "destructive",
      });
    },
  });

  const handleIndustrySelect = (industryId: string) => {
    setSelectedIndustry(industryId);
  };

  const handleContinue = () => {
    if (!selectedIndustry) {
      toast({
        title: "No Industry Selected",
        description: "Please choose an industry to continue",
        variant: "destructive",
      });
      return;
    }
    saveIndustryMutation.mutate(selectedIndustry);
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
             height: '550px',
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
               height: '480px',
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
              Select Industry
            </h2>
            <div className="text-green-800 text-sm">
              Choose the business type for your CRM simulation
            </div>
          </div>
          
          {/* Industry Grid */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {industries.map((industry) => (
              <button
                key={industry.id}
                onClick={() => handleIndustrySelect(industry.id)}
                className={`p-3 rounded border-2 transition-all text-left ${
                  selectedIndustry === industry.id
                    ? 'border-green-800 bg-green-200'
                    : 'border-green-700 bg-green-100 hover:bg-green-150'
                }`}
                style={{ 
                  backgroundColor: selectedIndustry === industry.id ? '#A8C090' : '#C8E0B0',
                }}
                data-testid={`industry-${industry.id}`}
              >
                <div className="text-green-900 font-bold text-sm mb-1">{industry.name}</div>
                <div className="text-green-800 text-xs">{industry.description}</div>
              </button>
            ))}
          </div>
          
          {/* Continue Button */}
          <div className="text-center">
            <button
              onClick={handleContinue}
              disabled={!selectedIndustry || saveIndustryMutation.isPending}
              className="bg-red-800 text-white py-3 px-8 rounded text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-50"
              data-testid="button-continue"
            >
              {saveIndustryMutation.isPending ? 'SAVING...' : 'CONTINUE'}
            </button>
          </div>
          
          {/* Back Button */}
          <div className="text-center mt-4">
            <button
              onClick={() => setLocation('/theme-selection')}
              className="text-green-700 text-xs underline hover:text-green-600"
              data-testid="button-back"
            >
              Back to Theme Selection
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}