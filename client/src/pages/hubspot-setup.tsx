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
  const { user, session, setSession } = useSession();

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
        
        // CRITICAL: Update client session state immediately after server update
        if (session) {
          const updatedSession = { ...session, hubspotToken: hubspotToken };
          const { setSession } = useSession.getState();
          setSession(updatedSession);
        }

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
          ⚙️ HubSpot Setup
        </h1>
        <div className="text-sm mb-2" style={{ color: '#1e3a5f' }}>
          Connect your HubSpot account to start simulating
        </div>
        <div className="text-xs" style={{ color: '#6c7b7f' }}>
          Player: {user.username} | Tier: {user.playerTier} | Credits: {user.creditLimit}
        </div>
      </div>

      {/* Main Content */}
      <div className="px-8 pb-8">
        <div className="max-w-2xl mx-auto">

          {/* Setup Instructions Header */}
          <div className="text-center mb-6">
            <h2 className="text-lg font-bold uppercase tracking-wide mb-4" style={{ color: '#1e3a5f' }}>
              API Configuration
            </h2>
          </div>

          {/* HubSpot Integration Section */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm mb-2 font-bold uppercase tracking-wide" style={{ color: '#000000' }}>
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

            <div className="text-xs leading-relaxed" style={{ color: '#000000' }}>
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
              className="text-white py-2 px-6 rounded text-sm font-bold transition-colors disabled:opacity-50"
              style={{ backgroundColor: validateTokenMutation.isPending ? '#6c7b7f' : '#8b0000' }}
              onMouseEnter={(e) => !validateTokenMutation.isPending && (e.currentTarget.style.backgroundColor = '#a00000')}
              onMouseLeave={(e) => !validateTokenMutation.isPending && (e.currentTarget.style.backgroundColor = '#8b0000')}
              data-testid="button-connect"
            >
              {validateTokenMutation.isPending ? 'CONNECTING...' : 'CONNECT'}
            </button>

            <button
              onClick={handleSkip}
              className="text-white py-2 px-6 rounded text-sm font-bold transition-colors"
              style={{ backgroundColor: '#6c7b7f', color: '#9fb89f' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#7c8b8f'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#6c7b7f'}
              data-testid="button-skip"
            >
              SKIP FOR NOW
            </button>
          </div>

          {/* Back Button */}
          <div className="text-center mt-6">
            <button
              onClick={() => setLocation('/saas-selection')}
              className="px-6 py-2 font-bold tracking-wide transition-all"
              style={{
                color: '#1e3a5f',
                textDecoration: 'underline',
                fontFamily: 'Open Sans, sans-serif',
                fontSize: '0.75rem',
                lineHeight: '1rem'
              }}
              data-testid="button-back"
            >
              ← Back to SaaS Selection
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}