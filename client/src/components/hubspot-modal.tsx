import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useSession } from '@/hooks/use-session';

interface HubSpotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function HubSpotModal({ isOpen, onClose, onSuccess }: HubSpotModalProps) {
  const [token, setToken] = useState('');
  const { toast } = useToast();
  const { session, setSession } = useSession();

  const validateTokenMutation = useMutation({
    mutationFn: async (token: string) => {
      return apiRequest('POST', '/api/validate-hubspot-token', { token });
    },
    onSuccess: async () => {
      if (session?.userId) {
        const response = await apiRequest('PUT', `/api/session/${session.userId}`, {
          hubspotToken: token
        });
        const updatedSession = await response.json();
        setSession(updatedSession);
      }
      
      toast({
        title: "Success",
        description: "HubSpot token saved successfully",
      });
      
      setToken('');
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to validate HubSpot token",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (!token.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid token",
        variant: "destructive",
      });
      return;
    }
    validateTokenMutation.mutate(token);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gameboy-console p-6 rounded-lg max-w-sm w-full mx-4 font-gameboy">
        <h3 className="text-gameboy-contrast text-sm mb-4" data-testid="modal-title">
          HUBSPOT TOKEN
        </h3>
        <input
          type="password"
          placeholder="Enter Private App Token"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          className="w-full p-3 mb-4 bg-gameboy-screen text-gameboy-bg text-xs border-2 border-gameboy-bg rounded pixel-border"
          data-testid="input-token"
        />
        <div className="text-xs text-gameboy-contrast mb-4">
          <span className="underline cursor-pointer">No credentials? Setup guide here</span>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handleSave}
            disabled={validateTokenMutation.isPending}
            className="flex-1 bg-gameboy-bg text-gameboy-screen py-2 px-4 rounded text-xs hover:bg-gameboy-contrast transition-colors disabled:opacity-50"
            data-testid="button-save"
          >
            {validateTokenMutation.isPending ? 'SAVING...' : 'SAVE'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gameboy-screen-dark text-gameboy-bg py-2 px-4 rounded text-xs hover:opacity-80 transition-colors"
            data-testid="button-cancel"
          >
            CANCEL
          </button>
        </div>
      </div>
    </div>
  );
}
