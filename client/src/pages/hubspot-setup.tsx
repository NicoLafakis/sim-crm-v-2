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
        
        // Proceed to theme selection
        setLocation('/theme-selection');
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
             width: '600px',
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
               width: '500px',
               boxShadow: 'inset 4px 4px 5px 0px #444'
             }}>
          
          {/* HubSpot Header */}
          <div className="text-center mb-6">
            <h2 className="text-green-900 text-xl font-bold uppercase tracking-wide mb-2">
              🟠 HubSpot Setup
            </h2>
            <div className="text-green-800 text-sm">
              Connect your HubSpot account to start simulating
            </div>
            <div className="text-green-700 text-xs mt-1">
              Player: {user.username} | Tier: {user.playerTier} | Credits: {user.creditLimit}
            </div>
          </div>
          
          {/* HubSpot Integration Section */}
          <div className="space-y-4">
            <div>
              <label className="block text-green-900 text-sm mb-2 font-bold uppercase tracking-wide">
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
            
            <div className="text-green-800 text-xs leading-relaxed">
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
          <div className="flex justify-center space-x-4 mt-6">
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
          <div className="text-center mt-4">
            <button
              onClick={() => setLocation('/saas-selection')}
              className="text-green-700 text-xs underline hover:text-green-600"
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