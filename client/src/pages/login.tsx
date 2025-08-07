import { useState } from 'react';
import { useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useSession } from '@/hooks/use-session';

export default function Login() {
  const [, setLocation] = useLocation();
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { toast } = useToast();
  const { setUser, setSession } = useSession();

  const authMutation = useMutation({
    mutationFn: async (data: { username: string; password: string }) => {
      const endpoint = isRegistering ? '/api/auth/register' : '/api/auth/login';
      return apiRequest('POST', endpoint, data);
    },
    onSuccess: async (response) => {
      const data = await response.json();
      setUser(data.user);
      setSession(data.session);
      
      toast({
        title: "Success",
        description: isRegistering ? "Account created successfully!" : "Logged in successfully!",
      });
      
      setLocation('/profile');
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Authentication failed",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast({
        title: "Error",
        description: "Please enter both username and password",
        variant: "destructive",
      });
      return;
    }
    authMutation.mutate({ username, password });
  };

  return (
    <div className="min-h-screen bg-gameboy-light-gray flex items-center justify-center font-gameboy"
         style={{
           backgroundImage: `radial-gradient(circle, var(--gameboy-dark-gray) 1px, transparent 1px)`,
           backgroundSize: '20px 20px'
         }}>
      
      {/* SimCRM. Title */}
      <div className="absolute top-16">
        <h1 className="text-2xl tracking-wider">
          <span className="text-gameboy-navy">SimCRM</span>
          <span className="text-gameboy-maroon">.</span>
        </h1>
      </div>
      
      {/* Main Gray Rectangle */}
      <div className="bg-gameboy-console border-4 border-gameboy-console-dark rounded-lg p-8 max-w-sm w-full mx-4 relative"
           style={{
             clipPath: 'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 0 100%)'
           }}>
        
        {/* Game Boy Screen */}
        <div className="bg-gameboy-screen border-4 border-gameboy-bg p-6 rounded-lg mb-6"
             style={{ aspectRatio: '4/3' }}>
          <form onSubmit={handleSubmit} className="h-full flex flex-col justify-center space-y-4">
            
            {/* Player Name Field */}
            <div>
              <label className="block text-gameboy-bg text-xs mb-1 uppercase">Player Name</label>
              <input
                type="text"
                placeholder="Enter Player Name"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full p-2 bg-gameboy-screen-dark text-gameboy-bg text-xs border-2 border-gameboy-bg rounded pixel-border"
                data-testid="input-username"
              />
            </div>
            
            {/* Passcode Field */}
            <div>
              <label className="block text-gameboy-bg text-xs mb-1 uppercase">Passcode</label>
              <input
                type="password"
                placeholder="Enter Passcode"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-2 bg-gameboy-screen-dark text-gameboy-bg text-xs border-2 border-gameboy-bg rounded pixel-border"
                data-testid="input-password"
              />
            </div>
          </form>
        </div>
        
        {/* Signup Text */}
        <div className="text-center text-xs text-gameboy-contrast mb-4">
          {isRegistering ? (
            <>
              have an account?{' '}
              <span 
                className="underline cursor-pointer" 
                onClick={() => setIsRegistering(false)}
                data-testid="link-login"
              >
                LOGIN HERE
              </span>
            </>
          ) : (
            <>
              no login?{' '}
              <span 
                className="underline cursor-pointer" 
                onClick={() => setIsRegistering(true)}
                data-testid="link-register"
              >
                CREATE YOUR PLAYER PROFILE HERE
              </span>
            </>
          )}
        </div>
        
        {/* Login Button */}
        <div className="flex justify-center">
          <button
            onClick={handleSubmit}
            disabled={authMutation.isPending}
            className="bg-gameboy-maroon text-gameboy-screen py-2 px-8 rounded text-xs font-bold hover:opacity-80 transition-opacity disabled:opacity-50"
            data-testid="button-submit"
          >
            {authMutation.isPending 
              ? 'PROCESSING...' 
              : isRegistering 
                ? 'Sign Up' 
                : 'Login'
            }
          </button>
        </div>
      </div>
    </div>
  );
}
