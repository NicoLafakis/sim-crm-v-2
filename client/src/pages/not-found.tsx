import { useLocation } from 'wouter';

export default function NotFound() {
  const [, setLocation] = useLocation();

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
          Page Not Found
        </h1>
        <div className="text-sm" style={{ color: '#6c7b7f' }}>
          The page you're looking for doesn't exist
        </div>
      </div>
      
      {/* Main Content */}
      <div className="px-8 pb-8 text-center">
        <div className="max-w-md mx-auto">
          <div className="text-6xl mb-4">❌</div>
          <div className="text-lg mb-6" style={{ color: '#1e3a5f' }}>
            ERROR 404
          </div>
          
          <button
            onClick={() => setLocation('/')}
            className="text-white py-2 px-6 rounded text-sm font-bold transition-colors"
            style={{ backgroundColor: '#8b0000' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#a00000'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#8b0000'}
            data-testid="button-home"
          >
            GO HOME
          </button>
        </div>
      </div>
    </div>
  );
}