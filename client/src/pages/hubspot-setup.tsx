import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useSession } from '@/hooks/use-session';

export default function HubSpotSetup() {
  const [, setLocation] = useLocation();
  const [hubspotToken, setHubspotToken] = useState('');
  const { toast } = useToast();
  const { user, session } = useSession();
  
  // Parse URL parameters for redirect context
  const urlParams = new URLSearchParams(window.location.search);
  const redirectFrom = urlParams.get('redirect');
  const selectedTheme = urlParams.get('theme');

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      setLocation('/login');
    }
  }, [user, setLocation]);

  // Load existing HubSpot token from session
  useEffect(() => {
    if (session?.hubspotToken) {
      setHubspotToken(session.hubspotToken);
    }
  }, [session]);

  const validateTokenMutation = useMutation({
    mutationFn: async (token: string) => {
      return apiRequest('POST', '/api/validate-hubspot-token', { token });
    },
    onSuccess: async () => {
      // Update session with valid token
      if (user?.id) {
        await apiRequest('PUT', `/api/session/${user.id}`, {
          hubspotToken: hubspotToken
        });
        queryClient.invalidateQueries({ queryKey: ['/api/session', user.id] });
        
        toast({
          title: "Success",
          description: "HubSpot token validated and saved!",
        });
        
        // Proceed based on redirect context
        if (redirectFrom === 'simulation' && selectedTheme) {
          // User was redirected from theme selection, go back to theme selection
          setLocation('/theme-selection');
        } else {
          // Normal flow, proceed to theme selection
          setLocation('/theme-selection');
        }
      }
    },
    onError: (error) => {
      toast({
        title: "Invalid Token",
        description: error.message || "Please check your HubSpot API token",
        variant: "destructive",
      });
    },
  });

  const handleSaveToken = () => {
    if (!hubspotToken.trim()) {
      toast({
        title: "Error",
        description: "Please enter a HubSpot API token",
        variant: "destructive",
      });
      return;
    }
    validateTokenMutation.mutate(hubspotToken);
  };

  const handleSkip = () => {
    setLocation('/theme-selection');
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
          ⚙️ HubSpot Setup
        </h1>
        <div className="text-sm mb-2" style={{ color: 'rgb(200, 220, 140)' }}>
          Connect your HubSpot account to start simulating
        </div>
        <div className="text-xs" style={{ color: 'rgb(180, 200, 120)' }}>
          Player: {user.username} | Tier: {user.playerTier} | Credits: {user.creditLimit}
        </div>
      </div>
      
      {/* Main Content */}
      <div className="px-8 pb-8" style={{ 
        backgroundColor: 'rgb(34, 78, 34)',
        backgroundImage: 'linear-gradient(rgba(70, 120, 70, 0.45) 1px, transparent 1px), linear-gradient(90deg, rgba(70, 120, 70, 0.45) 1px, transparent 1px)',
        backgroundSize: '20px 20px'
      }}>
        <div className="max-w-2xl mx-auto">
          
          {/* Setup Instructions Header */}
          <div className="text-center mb-6">
            <h2 className="text-lg font-bold uppercase tracking-wide mb-4" style={{ color: 'rgb(200, 220, 140)' }}>
              API Configuration
            </h2>
          </div>
          
          {/* HubSpot Integration Section */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm mb-2 font-bold uppercase tracking-wide" style={{ color: 'rgb(200, 220, 140)' }}>
                HubSpot API Token
              </label>
              <input
                type="password"
                placeholder="Enter your HubSpot API token"
                value={hubspotToken}
                onChange={(e) => setHubspotToken(e.target.value)}
                className="w-full p-3 bg-green-300 text-green-900 text-sm border-2 border-green-700 rounded"
                style={{ backgroundColor: '#B8D4A0' }}
                data-testid="input-hubspot-token"
              />
            </div>
            
            <div className="text-xs leading-relaxed" style={{ color: 'rgb(180, 200, 120)' }}>
              <p className="mb-2 font-bold">Quick Setup Instructions:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Go to HubSpot → Settings → Integrations → Private Apps</li>
                <li>Create a new private app with CRM permissions</li>
                <li>Copy the access token and paste it above</li>
                <li>Click "Connect" to enable simulation features</li>
              </ol>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex justify-center space-x-4 mt-8">
            <button
              onClick={handleSaveToken}
              disabled={validateTokenMutation.isPending}
              className="bg-orange-600 text-white py-2 px-6 rounded text-sm font-bold hover:bg-orange-500 transition-colors disabled:opacity-50"
              data-testid="button-connect"
            >
              {validateTokenMutation.isPending ? 'CONNECTING...' : 'CONNECT'}
            </button>
            
            <button
              onClick={handleSkip}
              className="bg-gray-600 text-white py-2 px-6 rounded text-sm font-bold hover:bg-gray-500 transition-colors"
              data-testid="button-skip"
            >
              SKIP FOR NOW
            </button>
          </div>
          
          {/* Back Button */}
          <div className="text-center mt-6">
            <button
              onClick={() => setLocation('/saas-selection')}
              className="text-xs underline hover:opacity-75 transition-opacity"
              style={{ color: 'rgb(180, 200, 120)' }}
              data-testid="button-back"
            >
              Back to SaaS Selection
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}