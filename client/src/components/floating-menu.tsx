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
      {/* Menu Button - Extended hover area */}
      <div
        className="relative p-4 -m-4"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        style={{ minHeight: isOpen ? '320px' : '76px', minWidth: '76px' }}
      >
        <button
          className="w-14 h-14 border-2 rounded-lg shadow-lg flex items-center justify-center transition-colors duration-200"
          style={{
            backgroundColor: '#6c7b7f',
            borderColor: '#6c7b7f',
            color: '#1e3a5f'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#8b0000'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#6c7b7f'}
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
          <Card className="absolute top-16 right-full w-64 border-2 shadow-xl"
                style={{
                  backgroundColor: '#e8e8e8',
                  borderColor: '#6c7b7f'
                }}>
            <CardContent className="p-0">
              {menuItems.map((item, index) => {
                const Icon = item.icon;
                const isActive = location === item.path || 
                  (item.path === '/' && ['/saas-selection', '/hubspot-setup', '/theme-selection', '/industry-selection', '/record-frequency'].includes(location));
                
                return (
                  <Link key={index} href={item.path}>
                    <div
                      className="flex items-center space-x-3 p-4 cursor-pointer border-b last:border-b-0 transition-colors duration-200"
                      style={{
                        borderColor: 'rgba(108, 123, 127, 0.3)',
                        backgroundColor: isActive ? 'rgba(139, 0, 0, 0.1)' : 'transparent'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(139, 0, 0, 0.05)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isActive ? 'rgba(139, 0, 0, 0.1)' : 'transparent'}
                      data-testid={`menu-item-${item.label.toLowerCase()}`}
                    >
                      <div className="relative">
                        <Icon className="w-5 h-5" style={{ color: isActive ? '#1e3a5f' : '#6c7b7f' }} />
                        {item.pulsing && (
                          <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="font-mono font-semibold" style={{ color: isActive ? '#1e3a5f' : '#6c7b7f' }}>
                          {item.label}
                        </div>
                        <div className="text-xs" style={{ color: '#9fb89f' }}>
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
                <div className="p-4 border-t" style={{ 
                  backgroundColor: 'rgba(159, 184, 159, 0.1)', 
                  borderColor: 'rgba(108, 123, 127, 0.3)' 
                }}>
                  <div className="text-xs font-mono" style={{ color: '#6c7b7f' }}>
                    Signed in as <span style={{ color: '#1e3a5f' }}>{user.username}</span>
                  </div>
                  <div className="text-xs mt-1" style={{ color: '#9fb89f' }}>
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