import { useState } from 'react';
import { useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useSession } from '@/hooks/use-session';

const frequencies = [
  { id: '1h', name: '1 Hour', description: 'Quick burst simulation', credits: 10 },
  { id: '4h', name: '4 Hours', description: 'Half-day simulation', credits: 25 },
  { id: '1d', name: '1 Day', description: 'Full day simulation', credits: 50 },
  { id: '1w', name: '1 Week', description: 'Weekly simulation', credits: 100 },
  { id: '1m', name: '1 Month', description: 'Monthly simulation', credits: 200 },
  { id: 'custom', name: 'Custom', description: 'Set your own duration', credits: 'Variable' }
];

export default function FrequencySelection() {
  const [, setLocation] = useLocation();
  const [selectedFrequency, setSelectedFrequency] = useState<string>('');
  const [customDuration, setCustomDuration] = useState<string>('');
  const { toast } = useToast();
  const { user } = useSession();

  const saveFrequencyMutation = useMutation({
    mutationFn: async (frequency: string) => {
      if (!user?.id) throw new Error('User not authenticated');
      const finalFrequency = frequency === 'custom' ? customDuration : frequency;
      return apiRequest('PUT', `/api/session/${user.id}`, {
        selectedFrequency: finalFrequency
      });
    },
    onSuccess: async () => {
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: ['/api/session', user.id] });
      }
      
      toast({
        title: "Frequency Selected",
        description: "Proceeding to simulation setup...",
      });
      
      setLocation('/simulation-setup');
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save frequency selection",
        variant: "destructive",
      });
    },
  });

  const handleFrequencySelect = (frequencyId: string) => {
    setSelectedFrequency(frequencyId);
  };

  const handleContinue = () => {
    if (!selectedFrequency) {
      toast({
        title: "No Frequency Selected",
        description: "Please choose a simulation frequency to continue",
        variant: "destructive",
      });
      return;
    }

    if (selectedFrequency === 'custom' && !customDuration.trim()) {
      toast({
        title: "Custom Duration Required",
        description: "Please enter a custom duration",
        variant: "destructive",
      });
      return;
    }

    // Check credit limit
    const selectedFreq = frequencies.find(f => f.id === selectedFrequency);
    if (selectedFreq && typeof selectedFreq.credits === 'number' && user?.creditLimit) {
      if (selectedFreq.credits > user.creditLimit) {
        toast({
          title: "Insufficient Credits",
          description: `This simulation requires ${selectedFreq.credits} credits, but you only have ${user.creditLimit}`,
          variant: "destructive",
        });
        return;
      }
    }

    saveFrequencyMutation.mutate(selectedFrequency);
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
             width: '750px',
             height: '600px',
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
               height: '530px',
               display: 'flex',
               flexDirection: 'column',
               justifyContent: 'center',
               margin: 'auto',
               width: '650px',
               boxShadow: 'inset 4px 4px 5px 0px #444'
             }}>
          
          {/* Header */}
          <div className="text-center mb-6">
            <h2 className="text-green-900 text-lg font-bold uppercase tracking-wide mb-2">
              Simulation Frequency
            </h2>
            <div className="text-green-800 text-sm">
              How long should your CRM simulation run?
            </div>
            <div className="text-green-700 text-xs mt-2">
              Available Credits: {user?.creditLimit || 0}
            </div>
          </div>
          
          {/* Frequency Grid */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {frequencies.map((frequency) => (
              <button
                key={frequency.id}
                onClick={() => handleFrequencySelect(frequency.id)}
                disabled={typeof frequency.credits === 'number' && frequency.credits > (user?.creditLimit || 0)}
                className={`p-3 rounded border-2 transition-all text-left relative ${
                  selectedFrequency === frequency.id
                    ? 'border-green-800 bg-green-200'
                    : 'border-green-700 bg-green-100 hover:bg-green-150'
                } ${
                  typeof frequency.credits === 'number' && frequency.credits > (user?.creditLimit || 0)
                    ? 'opacity-50 cursor-not-allowed'
                    : ''
                }`}
                style={{ 
                  backgroundColor: selectedFrequency === frequency.id ? '#A8C090' : '#C8E0B0',
                }}
                data-testid={`frequency-${frequency.id}`}
              >
                <div className="text-green-900 font-bold text-sm mb-1">{frequency.name}</div>
                <div className="text-green-800 text-xs mb-2">{frequency.description}</div>
                <div className="text-green-700 text-xs font-bold">
                  Credits: {frequency.credits}
                </div>
                {typeof frequency.credits === 'number' && frequency.credits > (user?.creditLimit || 0) && (
                  <div className="absolute top-1 right-1 text-red-800 text-xs font-bold">
                    LOCKED
                  </div>
                )}
              </button>
            ))}
          </div>
          
          {/* Custom Duration Input */}
          {selectedFrequency === 'custom' && (
            <div className="mb-6">
              <label className="block text-green-900 text-sm mb-2 font-bold uppercase tracking-wide">
                Custom Duration
              </label>
              <input
                type="text"
                placeholder="e.g., 6 hours, 3 days, 2 weeks"
                value={customDuration}
                onChange={(e) => setCustomDuration(e.target.value)}
                className="w-full p-3 bg-green-300 text-green-900 text-sm border-2 border-green-700 rounded"
                style={{ backgroundColor: '#B8D4A0' }}
                data-testid="input-custom-duration"
              />
            </div>
          )}
          
          {/* Continue Button */}
          <div className="text-center">
            <button
              onClick={handleContinue}
              disabled={!selectedFrequency || saveFrequencyMutation.isPending}
              className="bg-red-800 text-white py-3 px-8 rounded text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-50"
              data-testid="button-continue"
            >
              {saveFrequencyMutation.isPending ? 'SAVING...' : 'CONTINUE'}
            </button>
          </div>
          
          {/* Back Button */}
          <div className="text-center mt-4">
            <button
              onClick={() => setLocation('/industry-selection')}
              className="text-green-700 text-xs underline hover:text-green-600"
              data-testid="button-back"
            >
              Back to Industry Selection
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}