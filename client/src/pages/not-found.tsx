import { useLocation } from 'wouter';

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen font-gameboy" 
         style={{ 
           backgroundColor: 'rgb(34, 78, 34)',
           backgroundImage: 'linear-gradient(rgba(70, 120, 70, 0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(70, 120, 70, 0.6) 1px, transparent 1px)',
           backgroundSize: '20px 20px'
         }}>
      
      {/* Header */}
      <div className="text-center pt-8 pb-6" style={{ 
        backgroundColor: 'rgb(34, 78, 34)',
        backgroundImage: 'linear-gradient(rgba(70, 120, 70, 0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(70, 120, 70, 0.6) 1px, transparent 1px)',
        backgroundSize: '20px 20px'
      }}>
        <h1 className="text-2xl font-bold uppercase tracking-wider mb-2" style={{ color: 'rgb(200, 220, 140)' }}>
          Page Not Found
        </h1>
        <div className="text-sm" style={{ color: 'rgb(180, 200, 120)' }}>
          The page you're looking for doesn't exist
        </div>
      </div>
      
      {/* Main Content */}
      <div className="px-8 pb-8 text-center" style={{ 
        backgroundColor: 'rgb(34, 78, 34)',
        backgroundImage: 'linear-gradient(rgba(70, 120, 70, 0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(70, 120, 70, 0.6) 1px, transparent 1px)',
        backgroundSize: '20px 20px'
      }}>
        <div className="max-w-md mx-auto">
          <div className="text-6xl mb-4">❌</div>
          <div className="text-lg mb-6" style={{ color: 'rgb(200, 220, 140)' }}>
            ERROR 404
          </div>
          
          <button
            onClick={() => setLocation('/')}
            className="bg-blue-600 text-white py-2 px-6 rounded text-sm font-bold hover:bg-blue-500 transition-colors"
            data-testid="button-home"
          >
            GO HOME
          </button>
        </div>
      </div>
    </div>
  );
}