import { useState } from 'react';
import { useLocation } from 'wouter';
import { useSession } from '@/hooks/use-session';
import { useToast } from '@/hooks/use-toast';

interface ObjectFrequency {
  name: string;
  value: number;
  enabled: boolean;
  icon: string;
}

export default function RecordFrequency() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, session } = useSession();

  const [objectFrequencies, setObjectFrequencies] = useState<ObjectFrequency[]>([
    { name: 'Contacts', value: 50, enabled: true, icon: '👤' },
    { name: 'Companies', value: 30, enabled: true, icon: '🏢' },
    { name: 'Deals', value: 20, enabled: true, icon: '💰' },
    { name: 'Tickets', value: 15, enabled: true, icon: '🎫' },
    { name: 'Notes', value: 40, enabled: true, icon: '📝' },
    { name: 'Calls', value: 25, enabled: false, icon: '📞' },
    { name: 'Tasks', value: 35, enabled: false, icon: '✅' },
  ]);

  const handleSliderChange = (index: number, newValue: number) => {
    if (!objectFrequencies[index].enabled) return;
    
    setObjectFrequencies(prev => 
      prev.map((obj, i) => 
        i === index ? { ...obj, value: newValue } : obj
      )
    );
  };

  const handleStartSimulation = () => {
    const enabledObjects = objectFrequencies.filter(obj => obj.enabled);
    if (enabledObjects.length === 0) {
      toast({
        title: "Configuration Required",
        description: "At least one object type must be enabled",
        variant: "destructive",
      });
      return;
    }

    // TODO: Start simulation with configured frequencies
    toast({
      title: "Simulation Starting",
      description: "Setting up your CRM simulation...",
    });
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
          🎛️ Record Frequency Mixer
        </h1>
        <div className="text-sm mb-2" style={{ color: 'rgb(200, 220, 140)' }}>
          Configure data generation frequency for each object type
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
      
      {/* Equalizer Board */}
      <div className="px-8 pb-8" style={{ 
        backgroundColor: 'rgb(34, 78, 34)',
        backgroundImage: 'linear-gradient(rgba(70, 120, 70, 0.45) 1px, transparent 1px), linear-gradient(90deg, rgba(70, 120, 70, 0.45) 1px, transparent 1px)',
        backgroundSize: '20px 20px'
      }}>
        <div className="max-w-5xl mx-auto">
          
          {/* Equalizer Container */}
          <div className="rounded-lg border-4 border-gray-700 p-6 mb-8" style={{
            backgroundColor: 'rgb(20, 20, 20)',
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)'
          }}>
            
            {/* EQ Display */}
            <div className="text-center mb-6">
              <div className="text-lg font-bold uppercase tracking-wider" style={{ color: 'rgb(0, 255, 0)' }}>
                SimCRM Frequency Mixer v1.0
              </div>
              <div className="text-xs mt-2" style={{ color: 'rgb(0, 200, 0)' }}>
                Adjust sliders to control record generation frequency
              </div>
            </div>

            {/* Sliders Container */}
            <div className="flex justify-center items-end space-x-6">
              {objectFrequencies.map((obj, index) => (
                <div key={obj.name} className="flex flex-col items-center">
                  
                  {/* Object Icon & Name */}
                  <div className="text-center mb-4">
                    <div className={`text-2xl mb-2 ${obj.enabled ? '' : 'opacity-30'}`}>
                      {obj.icon}
                    </div>
                    <div className={`text-xs font-bold uppercase tracking-wide ${
                      obj.enabled ? 'text-green-400' : 'text-gray-600'
                    }`}>
                      {obj.name}
                    </div>
                  </div>

                  {/* Slider Container */}
                  <div className="relative h-64 w-12 rounded border-2" style={{
                    backgroundColor: obj.enabled ? 'rgb(40, 40, 40)' : 'rgb(20, 20, 20)',
                    borderColor: obj.enabled ? 'rgb(100, 100, 100)' : 'rgb(60, 60, 60)'
                  }}>
                    
                    {/* Slider Track Marks */}
                    <div className="absolute inset-x-0 h-full">
                      {[...Array(11)].map((_, i) => (
                        <div
                          key={i}
                          className="absolute inset-x-0 h-px"
                          style={{
                            top: `${i * 10}%`,
                            backgroundColor: obj.enabled ? 'rgb(80, 80, 80)' : 'rgb(40, 40, 40)'
                          }}
                        />
                      ))}
                    </div>

                    {/* Slider Handle */}
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={obj.value}
                      onChange={(e) => handleSliderChange(index, parseInt(e.target.value))}
                      disabled={!obj.enabled}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      style={{ 
                        WebkitAppearance: 'slider-vertical'
                      } as React.CSSProperties}
                      data-testid={`slider-${obj.name.toLowerCase()}`}
                    />
                    
                    {/* Visual Slider Handle */}
                    <div
                      className={`absolute w-10 h-6 rounded border-2 transition-all ${
                        obj.enabled 
                          ? 'bg-green-500 border-green-300 shadow-lg' 
                          : 'bg-gray-700 border-gray-600'
                      }`}
                      style={{
                        left: '50%',
                        transform: 'translateX(-50%)',
                        bottom: `${obj.value}%`,
                        marginBottom: '-12px'
                      }}
                    />
                  </div>

                  {/* Value Display */}
                  <div className={`mt-4 text-center ${
                    obj.enabled ? 'text-green-400' : 'text-gray-600'
                  }`}>
                    <div className="text-lg font-bold">{obj.value}</div>
                    <div className="text-xs">records/day</div>
                  </div>

                  {/* Status */}
                  {!obj.enabled && (
                    <div className="text-xs text-red-400 mt-2 text-center">
                      COMING SOON
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => setLocation('/theme-selection')}
              className="px-6 py-3 rounded border-2 border-yellow-600 bg-yellow-700 text-white font-bold uppercase tracking-wide text-sm hover:bg-yellow-600 transition-all"
              data-testid="button-back"
            >
              ← Back to Themes
            </button>
            
            <button
              onClick={handleStartSimulation}
              className="px-8 py-3 rounded border-2 border-green-400 bg-green-600 text-white font-bold uppercase tracking-wide text-sm hover:bg-green-700 transition-all"
              data-testid="button-start-simulation"
            >
              🚀 Start Simulation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}