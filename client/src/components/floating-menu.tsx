import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Home, Activity, User, Menu, X } from 'lucide-react';
import { useSession } from '@/hooks/use-session';
import { useQuery } from '@tanstack/react-query';

interface Simulation {
  id: number;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'cancelled' | 'failed';
}

export default function FloatingMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [location] = useLocation();
  const { user } = useSession();

  const { data: simulations } = useQuery<Simulation[]>({
    queryKey: [`/api/user/${user?.id}/simulations`],
    enabled: !!user?.id,
  });

  const activeRuns = simulations?.filter(s => ['running', 'paused', 'pending'].includes(s.status))?.length || 0;
  const runningRuns = simulations?.filter(s => s.status === 'running')?.length || 0;

  const menuItems = [
    {
      icon: Home,
      label: 'Home',
      path: '/',
      description: 'Choose a SaaS',
    },
    {
      icon: Activity,
      label: 'Progress',
      path: '/progress',
      description: 'Current Runs',
      badge: activeRuns > 0 ? activeRuns : undefined,
      pulsing: runningRuns > 0,
    },
    {
      icon: User,
      label: 'Profile',
      path: '/profile',
      description: 'User Profile',
    },
  ];

  return (
    <div className="fixed top-6 right-6 z-50">
      {/* Menu Button */}
      <div
        className="relative"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
      >
        <button
          className="w-14 h-14 bg-[#1e2124] border-2 border-[#306230] rounded-lg shadow-lg flex items-center justify-center text-[#9bbc0f] hover:bg-[#306230] transition-colors duration-200"
          data-testid="floating-menu-button"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          
          {/* Active runs indicator */}
          {activeRuns > 0 && (
            <Badge 
              className={`absolute -top-2 -right-2 w-6 h-6 p-0 flex items-center justify-center text-xs font-mono
                ${runningRuns > 0 ? 'bg-green-500 animate-pulse' : 'bg-blue-500'} text-white border-2 border-[#1e2124]`}
            >
              {activeRuns}
            </Badge>
          )}
        </button>

        {/* Menu Panel */}
        {isOpen && (
          <Card className="absolute top-16 right-0 w-64 bg-[#1e2124] border-2 border-[#306230] shadow-xl">
            <CardContent className="p-0">
              {menuItems.map((item, index) => {
                const Icon = item.icon;
                const isActive = location === item.path || 
                  (item.path === '/' && ['/saas-selection', '/hubspot-setup', '/theme-selection', '/industry-selection', '/record-frequency'].includes(location));
                
                return (
                  <Link key={index} href={item.path}>
                    <div
                      className={`flex items-center space-x-3 p-4 hover:bg-[#306230]/20 cursor-pointer border-b border-[#306230]/30 last:border-b-0 transition-colors duration-200
                        ${isActive ? 'bg-[#306230]/30 border-l-4 border-l-[#9bbc0f]' : ''}`}
                      data-testid={`menu-item-${item.label.toLowerCase()}`}
                    >
                      <div className="relative">
                        <Icon className={`w-5 h-5 ${isActive ? 'text-[#9bbc0f]' : 'text-[#9bbc0f]/75'}`} />
                        {item.pulsing && (
                          <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className={`font-mono font-semibold ${isActive ? 'text-[#9bbc0f]' : 'text-[#9bbc0f]/75'}`}>
                          {item.label}
                        </div>
                        <div className="text-xs text-[#9bbc0f]/60">
                          {item.description}
                        </div>
                      </div>
                      {item.badge && (
                        <Badge 
                          className={`${runningRuns > 0 && item.label === 'Progress' ? 'bg-green-500 animate-pulse' : 'bg-blue-500'} text-white font-mono`}
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </div>
                  </Link>
                );
              })}
              
              {/* User info at bottom */}
              {user && (
                <div className="p-4 bg-[#306230]/10 border-t border-[#306230]/30">
                  <div className="text-xs font-mono text-[#9bbc0f]/75">
                    Signed in as <span className="text-[#9bbc0f]">{user.username}</span>
                  </div>
                  <div className="text-xs text-[#9bbc0f]/60 mt-1">
                    {user.playerTier || 'New Player'} • {user.creditLimit || 0} credits
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}