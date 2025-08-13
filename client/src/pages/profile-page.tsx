import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useSession } from '@/hooks/use-session';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Trash2, Plus, Key, User, Shield } from 'lucide-react';

interface ApiToken {
  id: number;
  service: string;
  accessToken: string;
  maskedToken?: string;
  createdAt: string | Date | null;
  updatedAt: string | Date | null;
}

export default function ProfilePage() {
  const { user } = useSession();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: '',
  });
  const [newToken, setNewToken] = useState({
    service: '',
    token: '',
  });

  const { data: tokens } = useQuery<ApiToken[]>({
    queryKey: [`/api/user/${user?.id}/tokens`],
    enabled: !!user?.id,
  });

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      if (passwords.new !== passwords.confirm) {
        throw new Error('New passwords do not match');
      }
      return apiRequest('PUT', `/api/user/${user?.id}/password`, {
        currentPassword: passwords.current,
        newPassword: passwords.new,
      });
    },
    onSuccess: () => {
      setPasswords({ current: '', new: '', confirm: '' });
      // Password updated successfully
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update password.",
        variant: "destructive",
      });
    },
  });

  const addTokenMutation = useMutation({
    mutationFn: async () => {
      if (!newToken.service || !newToken.token) {
        throw new Error('Service and token are required');
      }
      return apiRequest('POST', `/api/user/${user?.id}/tokens`, {
        service: newToken.service,
        token: newToken.token,
      });
    },
    onSuccess: () => {
      setNewToken({ service: '', token: '' });
      queryClient.invalidateQueries({ queryKey: [`/api/user/${user?.id}/tokens`] });
      // Token added successfully
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add token.",
        variant: "destructive",
      });
    },
  });

  const removeTokenMutation = useMutation({
    mutationFn: async (tokenId: number) => {
      return apiRequest('DELETE', `/api/user/${user?.id}/tokens/${tokenId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/user/${user?.id}/tokens`] });
      // Token removed successfully
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove token.",
        variant: "destructive",
      });
    },
  });

  const getTierColor = (tier: string) => {
    switch (tier?.toLowerCase()) {
      case 'new player': return 'bg-gray-600';
      case 'level 1': return 'bg-blue-600';
      case 'level 2': return 'bg-purple-600';
      case 'level 3': return 'bg-gold-600';
      case 'level 4': return 'bg-diamond-600';
      default: return 'bg-gray-600';
    }
  };

  return (
    <div className="min-h-screen font-gameboy p-6" 
         style={{ 
           backgroundColor: '#e8e8e8',
           backgroundImage: `
             linear-gradient(to right, rgba(176, 176, 176, 0.3) 1px, transparent 1px),
             linear-gradient(to bottom, rgba(176, 176, 176, 0.3) 1px, transparent 1px)
           `,
           backgroundSize: '16px 16px'
         }}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4" style={{ color: '#1e3a5f', fontFamily: 'var(--font-gameboy)' }}>
            PLAYER PROFILE
          </h1>
        </div>

        {/* User Info Card */}
        <Card className="border-2" style={{ backgroundColor: '#e8e8e8', borderColor: '#6c7b7f', color: '#000000' }}>
          <CardHeader>
            <div className="flex items-center space-x-4">
              <User className="w-8 h-8" style={{ color: '#1e3a5f' }} />
              <div>
                <CardTitle className="text-2xl" style={{ color: '#1e3a5f', fontFamily: 'var(--font-gameboy)' }}>{user?.username}</CardTitle>
                <CardDescription style={{ color: '#000000' }}>
                  Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 rounded" style={{ 
                backgroundColor: '#e8e8e8',
                backgroundImage: `
                  linear-gradient(to right, rgba(176, 176, 176, 0.3) 1px, transparent 1px),
                  linear-gradient(to bottom, rgba(176, 176, 176, 0.3) 1px, transparent 1px)
                `,
                backgroundSize: '16px 16px'
              }}>
                <div className="text-2xl font-bold" style={{ color: '#1e3a5f', fontFamily: 'var(--font-gameboy)' }}>{user?.creditLimit || 0}</div>
                <div className="text-sm" style={{ color: '#000000' }}>Credit Limit</div>
              </div>
              <div className="text-center p-4 rounded" style={{ 
                backgroundColor: '#e8e8e8',
                backgroundImage: `
                  linear-gradient(to right, rgba(176, 176, 176, 0.3) 1px, transparent 1px),
                  linear-gradient(to bottom, rgba(176, 176, 176, 0.3) 1px, transparent 1px)
                `,
                backgroundSize: '16px 16px'
              }}>
                <Badge className={`${getTierColor(user?.playerTier || 'New Player')} text-white`} style={{ fontFamily: 'var(--font-gameboy)' }}>
                  {user?.playerTier || 'New Player'}
                </Badge>
                <div className="text-sm mt-2" style={{ color: '#000000' }}>Player Tier</div>
              </div>
              <div className="text-center p-4 rounded" style={{ 
                backgroundColor: '#e8e8e8',
                backgroundImage: `
                  linear-gradient(to right, rgba(176, 176, 176, 0.3) 1px, transparent 1px),
                  linear-gradient(to bottom, rgba(176, 176, 176, 0.3) 1px, transparent 1px)
                `,
                backgroundSize: '16px 16px'
              }}>
                <div className="text-2xl font-bold" style={{ color: '#1e3a5f', fontFamily: 'var(--font-gameboy)' }}>{tokens?.length || 0}</div>
                <div className="text-sm" style={{ color: '#000000' }}>API Tokens</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Password Change */}
        <Card className="border-2" style={{ backgroundColor: '#e8e8e8', borderColor: '#6c7b7f', color: '#000000' }}>
          <CardHeader>
            <div className="flex items-center space-x-4">
              <Shield className="w-6 h-6" style={{ color: '#1e3a5f' }} />
              <CardTitle style={{ color: '#1e3a5f', fontFamily: 'var(--font-gameboy)' }}>Change Password</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="current-password" className="font-mono" style={{ color: '#000000' }}>Current Password</Label>
              <Input
                id="current-password"
                type="password"
                value={passwords.current}
                onChange={(e) => setPasswords(prev => ({ ...prev, current: e.target.value }))}
                style={{ backgroundColor: '#e8e8e8', borderColor: '#6c7b7f', color: '#000000 !important' }}
                data-testid="input-current-password"
              />
            </div>
            <div>
              <Label htmlFor="new-password" className="font-mono" style={{ color: '#000000' }}>New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={passwords.new}
                onChange={(e) => setPasswords(prev => ({ ...prev, new: e.target.value }))}
                style={{ backgroundColor: '#e8e8e8', borderColor: '#6c7b7f', color: '#000000 !important' }}
                data-testid="input-new-password"
              />
            </div>
            <div>
              <Label htmlFor="confirm-password" className="font-mono" style={{ color: '#000000' }}>Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={passwords.confirm}
                onChange={(e) => setPasswords(prev => ({ ...prev, confirm: e.target.value }))}
                style={{ backgroundColor: '#e8e8e8', borderColor: '#6c7b7f', color: '#000000 !important' }}
                data-testid="input-confirm-password"
              />
            </div>
            <Button
              onClick={() => changePasswordMutation.mutate()}
              disabled={changePasswordMutation.isPending || !passwords.current || !passwords.new || !passwords.confirm}
              className="font-mono"
              style={{ backgroundColor: '#8b0000', borderColor: '#8b0000', color: 'white' }}
              data-testid="button-change-password"
            >
              Update Password
            </Button>
          </CardContent>
        </Card>

        {/* API Tokens */}
        <Card className="border-2" style={{ backgroundColor: '#e8e8e8', borderColor: '#6c7b7f', color: '#000000' }}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Key className="w-6 h-6" style={{ color: '#1e3a5f' }} />
                <CardTitle style={{ color: '#1e3a5f', fontFamily: 'var(--font-gameboy)' }}>API Tokens</CardTitle>
              </div>
            </div>
            <CardDescription style={{ color: '#000000' }}>
              Manage your API tokens for external services like HubSpot, OpenAI, etc.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Existing Tokens */}
            {tokens?.map((token) => (
              <div
                key={token.id}
                className="flex items-center justify-between p-4 rounded" style={{ 
                  backgroundColor: '#e8e8e8',
                  backgroundImage: `
                    linear-gradient(to right, rgba(176, 176, 176, 0.3) 1px, transparent 1px),
                    linear-gradient(to bottom, rgba(176, 176, 176, 0.3) 1px, transparent 1px)
                  `,
                  backgroundSize: '16px 16px'
                }}
                data-testid={`token-item-${token.id}`}
              >
                <div className="flex-1">
                  <div className="font-semibold" style={{ color: '#1e3a5f', fontFamily: 'var(--font-gameboy)' }}>{token.service}</div>
                  <div className="text-xs" style={{ color: '#000000', fontFamily: 'var(--font-mono)' }}>{token.maskedToken || token.accessToken.substring(0, 8) + '...' + token.accessToken.slice(-4)}</div>
                </div>
                <div className="text-right text-xs" style={{ color: '#000000' }}>
                  <div>Added: {token.createdAt ? new Date(token.createdAt).toLocaleDateString() : 'Unknown'}</div>
                  {token.updatedAt && (
                    <div>Updated: {new Date(token.updatedAt).toLocaleDateString()}</div>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => removeTokenMutation.mutate(token.id)}
                  disabled={removeTokenMutation.isPending}
                  className="ml-4"
                  style={{ backgroundColor: '#8b0000', borderColor: '#8b0000', color: 'white' }}
                  data-testid={`button-remove-token-${token.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}

            <Separator style={{ backgroundColor: '#6c7b7f' }} />

            {/* Add New Token */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center" style={{ fontFamily: 'var(--font-gameboy)', color: '#1e3a5f' }}>
                <Plus className="w-4 h-4 mr-2" style={{ color: '#1e3a5f' }} />
                Add New Token
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="token-service" className="font-mono" style={{ color: '#000000' }}>Service</Label>
                  <Input
                    id="token-service"
                    placeholder="e.g., HubSpot"
                    value={newToken.service}
                    onChange={(e) => setNewToken(prev => ({ ...prev, service: e.target.value }))}
                    style={{ backgroundColor: '#e8e8e8', borderColor: '#6c7b7f', color: '#000000 !important' }}
                    data-testid="input-token-service"
                  />
                </div>
                <div>
                  <Label htmlFor="token-value" className="font-mono" style={{ color: '#000000' }}>Token</Label>
                  <div className="relative">
                    <Input
                      id="token-value"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="pat-na1-..."
                      value={newToken.token}
                      onChange={(e) => setNewToken(prev => ({ ...prev, token: e.target.value }))}
                      className="pr-10"
                      style={{ backgroundColor: '#e8e8e8', borderColor: '#6c7b7f', color: '#000000 !important' }}
                      data-testid="input-token-value"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      style={{ color: '#1e3a5f' }}
                      onClick={() => setShowPassword(!showPassword)}
                      data-testid="button-toggle-token-visibility"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </div>
              <Button
                onClick={() => addTokenMutation.mutate()}
                disabled={addTokenMutation.isPending || !newToken.service || !newToken.token}
                className="font-mono"
                style={{ backgroundColor: '#8b0000', borderColor: '#8b0000', color: 'white' }}
                data-testid="button-add-token"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Token
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}