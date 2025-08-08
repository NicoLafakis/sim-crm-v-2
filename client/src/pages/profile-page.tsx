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
      toast({
        title: "Password updated",
        description: "Your password has been changed successfully.",
      });
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
      toast({
        title: "Token added",
        description: "API token has been saved securely.",
      });
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
      toast({
        title: "Token removed",
        description: "API token has been deleted.",
      });
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
    <div className="min-h-screen bg-[#9bbc0f] p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-mono font-bold text-[#1e2124] mb-4">
            PLAYER PROFILE
          </h1>
        </div>

        {/* User Info Card */}
        <Card className="bg-[#1e2124] border-2 border-[#306230] text-[#9bbc0f]">
          <CardHeader>
            <div className="flex items-center space-x-4">
              <User className="w-8 h-8" />
              <div>
                <CardTitle className="font-mono text-2xl">{user?.username}</CardTitle>
                <CardDescription className="text-[#9bbc0f]/75">
                  Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-[#306230]/20 rounded">
                <div className="text-2xl font-mono font-bold">{user?.creditLimit || 0}</div>
                <div className="text-sm opacity-75">Credit Limit</div>
              </div>
              <div className="text-center p-4 bg-[#306230]/20 rounded">
                <Badge className={`${getTierColor(user?.playerTier || 'New Player')} text-white font-mono`}>
                  {user?.playerTier || 'New Player'}
                </Badge>
                <div className="text-sm opacity-75 mt-2">Player Tier</div>
              </div>
              <div className="text-center p-4 bg-[#306230]/20 rounded">
                <div className="text-2xl font-mono font-bold">{tokens?.length || 0}</div>
                <div className="text-sm opacity-75">API Tokens</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Password Change */}
        <Card className="bg-[#1e2124] border-2 border-[#306230] text-[#9bbc0f]">
          <CardHeader>
            <div className="flex items-center space-x-4">
              <Shield className="w-6 h-6" />
              <CardTitle className="font-mono">Change Password</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="current-password" className="font-mono">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                value={passwords.current}
                onChange={(e) => setPasswords(prev => ({ ...prev, current: e.target.value }))}
                className="bg-[#306230]/20 border-[#306230] text-[#9bbc0f]"
                data-testid="input-current-password"
              />
            </div>
            <div>
              <Label htmlFor="new-password" className="font-mono">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={passwords.new}
                onChange={(e) => setPasswords(prev => ({ ...prev, new: e.target.value }))}
                className="bg-[#306230]/20 border-[#306230] text-[#9bbc0f]"
                data-testid="input-new-password"
              />
            </div>
            <div>
              <Label htmlFor="confirm-password" className="font-mono">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={passwords.confirm}
                onChange={(e) => setPasswords(prev => ({ ...prev, confirm: e.target.value }))}
                className="bg-[#306230]/20 border-[#306230] text-[#9bbc0f]"
                data-testid="input-confirm-password"
              />
            </div>
            <Button
              onClick={() => changePasswordMutation.mutate()}
              disabled={changePasswordMutation.isPending || !passwords.current || !passwords.new || !passwords.confirm}
              className="bg-[#306230] hover:bg-[#306230]/80 text-[#9bbc0f] font-mono"
              data-testid="button-change-password"
            >
              Update Password
            </Button>
          </CardContent>
        </Card>

        {/* API Tokens */}
        <Card className="bg-[#1e2124] border-2 border-[#306230] text-[#9bbc0f]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Key className="w-6 h-6" />
                <CardTitle className="font-mono">API Tokens</CardTitle>
              </div>
            </div>
            <CardDescription className="text-[#9bbc0f]/75">
              Manage your API tokens for external services like HubSpot, OpenAI, etc.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Existing Tokens */}
            {tokens?.map((token) => (
              <div
                key={token.id}
                className="flex items-center justify-between p-4 bg-[#306230]/20 rounded"
                data-testid={`token-item-${token.id}`}
              >
                <div className="flex-1">
                  <div className="font-mono font-semibold">{token.service}</div>
                  <div className="text-xs opacity-60 font-mono">{token.maskedToken || token.accessToken.substring(0, 8) + '...' + token.accessToken.slice(-4)}</div>
                </div>
                <div className="text-right text-xs opacity-75">
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
                  className="ml-4 bg-red-600 text-white hover:bg-red-700"
                  data-testid={`button-remove-token-${token.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}

            <Separator className="bg-[#306230]" />

            {/* Add New Token */}
            <div className="space-y-4">
              <h3 className="font-mono font-semibold flex items-center">
                <Plus className="w-4 h-4 mr-2" />
                Add New Token
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="token-service" className="font-mono">Service</Label>
                  <Input
                    id="token-service"
                    placeholder="e.g., HubSpot"
                    value={newToken.service}
                    onChange={(e) => setNewToken(prev => ({ ...prev, service: e.target.value }))}
                    className="bg-[#306230]/20 border-[#306230] text-[#9bbc0f]"
                    data-testid="input-token-service"
                  />
                </div>
                <div>
                  <Label htmlFor="token-value" className="font-mono">Token</Label>
                  <div className="relative">
                    <Input
                      id="token-value"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="pat-na1-..."
                      value={newToken.token}
                      onChange={(e) => setNewToken(prev => ({ ...prev, token: e.target.value }))}
                      className="bg-[#306230]/20 border-[#306230] text-[#9bbc0f] pr-10"
                      data-testid="input-token-value"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 text-[#9bbc0f]"
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
                className="bg-[#306230] hover:bg-[#306230]/80 text-[#9bbc0f] font-mono"
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