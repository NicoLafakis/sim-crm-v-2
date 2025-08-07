import { useState } from 'react';
import { useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useSession } from '@/hooks/use-session';

interface HubSpotObjectConfig {
  contacts: number;
  companies: number;
  deals: number;
  tickets: number;
  products: number;
  tasks: number;
}

export default function SimulationSetup() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, session } = useSession();

  const [objectConfig, setObjectConfig] = useState<HubSpotObjectConfig>({
    contacts: 50,
    companies: 20,
    deals: 15,
    tickets: 30,
    products: 10,
    tasks: 25
  });

  const startSimulationMutation = useMutation({
    mutationFn: async (config: HubSpotObjectConfig) => {
      if (!user?.id) throw new Error('User not authenticated');
      return apiRequest('POST', '/api/simulation/start', {
        userId: user.id,
        settings: {
          theme: session?.selectedTheme,
          industry: session?.selectedIndustry,
          frequency: session?.selectedFrequency,
          objectDistribution: config
        }
      });
    },
    onSuccess: async (response) => {
      const result = await response.json();
      
      toast({
        title: "Simulation Started!",
        description: `Simulation ${result.simulationId} is now running`,
      });
      
      // In a real app, this would redirect to simulation dashboard
      setLocation('/');
    },
    onError: (error) => {
      toast({
        title: "Failed to Start Simulation",
        description: error.message || "Please check your configuration and try again",
        variant: "destructive",
      });
    },
  });

  const handleSliderChange = (objectType: keyof HubSpotObjectConfig, value: number) => {
    setObjectConfig(prev => ({
      ...prev,
      [objectType]: value
    }));
  };

  const handleStartSimulation = () => {
    if (!session?.selectedTheme || !session?.selectedIndustry || !session?.selectedFrequency) {
      toast({
        title: "Incomplete Setup",
        description: "Please complete all previous steps before starting simulation",
        variant: "destructive",
      });
      return;
    }

    startSimulationMutation.mutate(objectConfig);
  };

  const totalObjects = Object.values(objectConfig).reduce((sum, val) => sum + val, 0);
  const estimatedCredits = Math.ceil(totalObjects / 10); // Rough estimate

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
             width: '850px',
             height: '650px',
             borderBottomRightRadius: '70px',
             borderTopRightRadius: '20px',
             borderTopLeftRadius: '20px',
             borderBottomLeftRadius: '20px'
           }}>
        
        {/* Game Boy Screen */}
        <div className="bg-yellow-500 p-6" 
             style={{ 
               backgroundColor: 'rgb(155, 187, 88)',
               borderRadius: '4px',
               height: '580px',
               display: 'flex',
               flexDirection: 'column',
               margin: 'auto',
               width: '750px',
               boxShadow: 'inset 4px 4px 5px 0px #444',
               overflow: 'auto'
             }}>
          
          {/* Header */}
          <div className="text-center mb-6">
            <h2 className="text-green-900 text-lg font-bold uppercase tracking-wide mb-2">
              Simulation Mixer
            </h2>
            <div className="text-green-800 text-sm mb-2">
              Configure HubSpot object distribution for your {session?.selectedTheme} {session?.selectedIndustry} simulation
            </div>
            <div className="text-green-700 text-xs">
              Duration: {session?.selectedFrequency} | Total Objects: {totalObjects} | Est. Credits: {estimatedCredits}
            </div>
          </div>
          
          {/* Mixer Board */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            {Object.entries(objectConfig).map(([objectType, value]) => {
              const percentage = totalObjects > 0 ? Math.round((value / totalObjects) * 100) : 0;
              return (
                <div key={objectType} className="bg-green-100 p-4 rounded border-2 border-green-700"
                     style={{ backgroundColor: '#C8E0B0' }}>
                  
                  {/* Object Type Label */}
                  <div className="text-green-900 font-bold text-sm mb-2 uppercase text-center">
                    {objectType}
                  </div>
                  
                  {/* Value Display */}
                  <div className="text-center mb-3">
                    <div className="text-green-800 text-2xl font-bold">
                      {value}
                    </div>
                    <div className="text-green-700 text-xs">
                      {percentage}% of total
                    </div>
                  </div>
                  
                  {/* Slider Controls */}
                  <div className="space-y-2">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={value}
                      onChange={(e) => handleSliderChange(objectType as keyof HubSpotObjectConfig, parseInt(e.target.value))}
                      className="w-full h-2 bg-green-300 rounded-lg appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, #22C55E 0%, #22C55E ${value}%, #A3E635 ${value}%, #A3E635 100%)`
                      }}
                      data-testid={`slider-${objectType}`}
                    />
                    
                    {/* Fine Control Buttons */}
                    <div className="flex justify-between">
                      <button
                        onClick={() => handleSliderChange(objectType as keyof HubSpotObjectConfig, Math.max(0, value - 5))}
                        className="bg-green-700 text-white px-2 py-1 rounded text-xs font-bold hover:bg-green-600"
                        data-testid={`decrease-${objectType}`}
                      >
                        -5
                      </button>
                      <button
                        onClick={() => handleSliderChange(objectType as keyof HubSpotObjectConfig, Math.min(100, value + 5))}
                        className="bg-green-700 text-white px-2 py-1 rounded text-xs font-bold hover:bg-green-600"
                        data-testid={`increase-${objectType}`}
                      >
                        +5
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Preset Buttons */}
          <div className="flex justify-center space-x-3 mb-6">
            <button
              onClick={() => setObjectConfig({ contacts: 70, companies: 30, deals: 20, tickets: 10, products: 5, tasks: 15 })}
              className="bg-blue-600 text-white py-2 px-4 rounded text-xs font-bold hover:bg-blue-500"
              data-testid="preset-sales-focused"
            >
              SALES FOCUSED
            </button>
            <button
              onClick={() => setObjectConfig({ contacts: 40, companies: 20, deals: 10, tickets: 50, products: 15, tasks: 35 })}
              className="bg-purple-600 text-white py-2 px-4 rounded text-xs font-bold hover:bg-purple-500"
              data-testid="preset-support-focused"
            >
              SUPPORT FOCUSED
            </button>
            <button
              onClick={() => setObjectConfig({ contacts: 50, companies: 20, deals: 15, tickets: 30, products: 10, tasks: 25 })}
              className="bg-gray-600 text-white py-2 px-4 rounded text-xs font-bold hover:bg-gray-500"
              data-testid="preset-balanced"
            >
              BALANCED
            </button>
          </div>
          
          {/* Start Simulation Button */}
          <div className="text-center">
            <button
              onClick={handleStartSimulation}
              disabled={startSimulationMutation.isPending || estimatedCredits > (user?.creditLimit || 0)}
              className="bg-red-800 text-white py-4 px-12 rounded text-lg font-bold hover:bg-red-700 transition-colors disabled:opacity-50"
              data-testid="button-start-simulation"
            >
              {startSimulationMutation.isPending 
                ? 'STARTING...' 
                : estimatedCredits > (user?.creditLimit || 0)
                  ? `INSUFFICIENT CREDITS (${estimatedCredits}/${user?.creditLimit})`
                  : 'START SIMULATION'
              }
            </button>
          </div>
          
          {/* Back Button */}
          <div className="text-center mt-4">
            <button
              onClick={() => setLocation('/frequency-selection')}
              className="text-green-700 text-xs underline hover:text-green-600"
              data-testid="button-back"
            >
              Back to Frequency Selection
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}