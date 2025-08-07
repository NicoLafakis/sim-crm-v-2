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
          
          {/* Compact Equalizer Container */}
          <div className="rounded border-2 border-gray-600 p-4 mb-8 mx-auto max-w-4xl" style={{
            backgroundColor: 'rgb(45, 45, 45)',
            boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.6), 0 1px 0 rgba(255,255,255,0.1)'
          }}>
            
            {/* Compact EQ Display */}
            <div className="text-center mb-4">
              <div className="text-sm font-bold uppercase tracking-wider" style={{ color: 'rgb(0, 255, 0)' }}>
                SIMCRM EQUALIZER
              </div>
              <div className="text-xs mt-1" style={{ color: 'rgb(0, 200, 0)' }}>
                Record Generation Frequency
              </div>
            </div>

            {/* Compact WinAmp-style Sliders */}
            <div className="flex justify-center items-end space-x-3 mx-auto max-w-3xl">
              {objectFrequencies.map((obj, index) => (
                <div key={obj.name} className="flex flex-col items-center">
                  
                  {/* Compact Slider Container */}
                  <div 
                    className={`relative h-32 w-6 rounded border ${obj.enabled ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                    style={{
                      backgroundColor: obj.enabled ? 'rgb(60, 60, 60)' : 'rgb(40, 40, 40)',
                      borderColor: obj.enabled ? 'rgb(120, 120, 120)' : 'rgb(80, 80, 80)',
                      boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)'
                    }}
                    onMouseDown={(e) => {
                      if (!obj.enabled) return;
                      
                      const rect = e.currentTarget.getBoundingClientRect();
                      const startY = e.clientY;
                      const containerHeight = rect.height;
                      
                      const handleMouseMove = (moveEvent: MouseEvent) => {
                        const currentY = moveEvent.clientY - rect.top;
                        const newValue = Math.round(100 - (currentY / containerHeight) * 100);
                        const clampedValue = Math.max(0, Math.min(100, newValue));
                        handleSliderChange(index, clampedValue);
                      };
                      
                      const handleMouseUp = () => {
                        document.removeEventListener('mousemove', handleMouseMove);
                        document.removeEventListener('mouseup', handleMouseUp);
                      };
                      
                      document.addEventListener('mousemove', handleMouseMove);
                      document.addEventListener('mouseup', handleMouseUp);
                      
                      // Set initial position
                      const clickY = e.clientY - rect.top;
                      const newValue = Math.round(100 - (clickY / containerHeight) * 100);
                      const clampedValue = Math.max(0, Math.min(100, newValue));
                      handleSliderChange(index, clampedValue);
                    }}
                  >
                    
                    {/* Track Marks */}
                    <div className="absolute inset-x-0 h-full pointer-events-none">
                      {[...Array(6)].map((_, i) => (
                        <div
                          key={i}
                          className="absolute inset-x-0"
                          style={{
                            top: `${i * 20}%`,
                            height: '1px',
                            backgroundColor: obj.enabled ? 'rgb(100, 100, 100)' : 'rgb(60, 60, 60)'
                          }}
                        />
                      ))}
                    </div>

                    {/* Hidden Input Slider for accessibility */}
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={obj.value}
                      onChange={(e) => handleSliderChange(index, parseInt(e.target.value))}
                      disabled={!obj.enabled}
                      className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
                      style={{ 
                        WebkitAppearance: 'slider-vertical'
                      } as React.CSSProperties}
                      data-testid={`slider-${obj.name.toLowerCase()}`}
                      tabIndex={obj.enabled ? 0 : -1}
                    />
                    
                    {/* Compact Slider Handle */}
                    <div
                      className={`absolute w-5 h-3 rounded-sm border transition-all pointer-events-none ${
                        obj.enabled 
                          ? 'bg-lime-400 border-lime-300 shadow-sm' 
                          : 'bg-gray-600 border-gray-500'
                      }`}
                      style={{
                        left: '50%',
                        transform: 'translateX(-50%)',
                        bottom: `${obj.value}%`,
                        marginBottom: '-6px'
                      }}
                    />
                  </div>

                  {/* Compact Label */}
                  <div className={`mt-2 text-center ${
                    obj.enabled ? 'text-lime-400' : 'text-gray-500'
                  }`}>
                    <div className="text-xs font-bold uppercase tracking-wide">
                      {obj.name}
                    </div>
                    <div className="text-xs mt-1">{obj.value}</div>
                  </div>

                  {/* Coming Soon Status */}
                  {!obj.enabled && (
                    <div className="text-xs text-red-400 mt-1 text-center">
                      SOON
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => setLocation('/industry-selection')}
              className="px-6 py-2 text-sm font-bold uppercase tracking-wide transition-all"
              style={{ 
                color: 'rgb(200, 220, 140)',
                textDecoration: 'underline'
              }}
              data-testid="button-back"
            >
              ← Back to Industries
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