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
          <span className="text-blue-800">SimCRM</span>
          <span className="text-red-800">.</span>
        </h1>
      </div>
      
      {/* Main Console Frame */}
      <div className="bg-gray-500 p-6 relative"
           style={{ 
             background: 'linear-gradient(145deg, #8A8A8A, #6A6A6A)',
             width: '500px',
             height: '265px',
             borderBottomRightRadius: '70px',
             borderTopRightRadius: '20px',
             borderTopLeftRadius: '20px',
             borderBottomLeftRadius: '20px'
           }}>
        
        {/* Inner Black Border */}
        <div className="bg-black p-1" style={{ 
          borderRadius: '4px',
          boxShadow: 'inset 5px 6px 4px 1px #333',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          
          {/* Game Boy Screen */}
          <div className="bg-yellow-500 p-6" 
               style={{ 
                 backgroundColor: '#9BBB58',
                 borderRadius: '4px',
                 height: '100%'
               }}>
            
            <form onSubmit={handleSubmit} className="h-full flex flex-col justify-center space-y-6">
              
              {/* Player Name Field */}
              <div>
                <label className="block text-green-900 text-xs mb-2 font-bold uppercase tracking-wide">Player Name</label>
                <input
                  type="text"
                  placeholder="Enter Player Name"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full p-3 bg-green-300 text-green-900 text-xs border-2 border-green-700 rounded"
                  style={{ backgroundColor: '#B8D4A0' }}
                  data-testid="input-username"
                />
              </div>
              
              {/* Passcode Field */}
              <div>
                <label className="block text-green-900 text-xs mb-2 font-bold uppercase tracking-wide">Passcode</label>
                <input
                  type="password"
                  placeholder="Enter Passcode"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-3 bg-green-300 text-green-900 text-xs border-2 border-green-700 rounded"
                  style={{ backgroundColor: '#B8D4A0' }}
                  data-testid="input-password"
                />
              </div>
            </form>
          </div>
        </div>
      </div>
      
      {/* Signup Text */}
      <div className="text-center text-sm text-gray-700 mt-6 mb-4">
        {isRegistering ? (
          <>
            have an account?{' '}
            <span 
              className="font-bold cursor-pointer" 
              onClick={() => setIsRegistering(false)}
              data-testid="link-login"
            >
              LOGIN HERE
            </span>
          </>
        ) : (
          <>
            no login? <span 
              className="font-bold cursor-pointer" 
              onClick={() => setIsRegistering(true)}
              data-testid="link-register"
            >
              CREATE YOUR ACCOUNT HERE
            </span>
          </>
        )}
      </div>
      
      {/* Login Button */}
      <div className="flex justify-center">
        <button
          onClick={handleSubmit}
          disabled={authMutation.isPending}
          className="bg-red-800 text-white py-3 px-12 rounded text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-50 shadow-lg"
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
  );
}
