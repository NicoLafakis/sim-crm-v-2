import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';

const saasProducts = [
  { id: 'hubspot', name: 'HubSpot', icon: '🟠', description: 'Marketing Hub', available: true },
  { id: 'salesforce', name: 'Salesforce', icon: '☁️', description: 'Sales Cloud', available: false },
  { id: 'pipedrive', name: 'Pipedrive', icon: '🔵', description: 'CRM Platform', available: false },
  { id: 'monday', name: 'Monday.com', icon: '📊', description: 'Work OS', available: false },
  { id: 'zoho', name: 'Zoho CRM', icon: '🔸', description: 'Business Suite', available: false },
  { id: 'freshworks', name: 'Freshworks', icon: '🌿', description: 'Customer Suite', available: false },
  { id: 'mailchimp', name: 'Mailchimp', icon: '🐵', description: 'Marketing Platform', available: false },
  { id: 'active-campaign', name: 'ActiveCampaign', icon: '⚡', description: 'Email Marketing', available: false }
];

export default function SaasSelection() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleSaasSelect = (productId: string) => {
    if (productId === 'hubspot') {
      setLocation('/hubspot-setup');
    } else {
      toast({
        title: "Coming Soon",
        description: "This SaaS integration will be available in a future update",
        variant: "destructive",
      });
    }
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
          <span style={{ color: '#000782' }}>SimCRM</span>
          <span className="text-red-800">.</span>
        </h1>
      </div>
      
      {/* Main Console Frame */}
      <div className="bg-gray-500 p-6 relative"
           style={{ 
             background: 'linear-gradient(145deg, #8A8A8A, #6A6A6A)',
             width: '800px',
             height: '600px',
             borderBottomRightRadius: '70px',
             borderTopRightRadius: '20px',
             borderTopLeftRadius: '20px',
             borderBottomLeftRadius: '20px'
           }}>
        
        {/* Game Boy Screen */}
        <div className="bg-yellow-500 p-8" 
             style={{ 
               backgroundColor: 'rgb(155, 187, 88)',
               borderRadius: '4px',
               height: '530px',
               display: 'flex',
               flexDirection: 'column',
               margin: 'auto',
               width: '700px',
               boxShadow: 'inset 4px 4px 5px 0px #444'
             }}>
          
          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-green-900 text-2xl font-bold uppercase tracking-wide mb-4">
              Select a SaaS Product
            </h2>
          </div>
          
          {/* CRM & Marketing Platforms */}
          <div className="mb-8">
            <h3 className="text-green-800 text-lg font-bold uppercase tracking-wide text-center mb-4">
              CRM & Marketing
            </h3>
            <div className="grid grid-cols-4 gap-4">
              {saasProducts.slice(0, 4).map((product) => (
                <button
                  key={product.id}
                  onClick={() => handleSaasSelect(product.id)}
                  disabled={!product.available}
                  className={`p-4 rounded border-2 transition-all text-center relative ${
                    product.available
                      ? 'border-green-700 bg-green-100 hover:bg-green-200 cursor-pointer'
                      : 'border-gray-600 bg-gray-400 cursor-not-allowed opacity-60'
                  }`}
                  style={{ 
                    backgroundColor: product.available ? '#C8E0B0' : '#9CA3AF',
                    borderColor: product.available ? '#15803d' : '#4B5563'
                  }}
                  data-testid={`saas-${product.id}`}
                >
                  <div className="text-2xl mb-2">{product.icon}</div>
                  <div className={`font-bold text-xs mb-1 ${
                    product.available ? 'text-green-900' : 'text-gray-600'
                  }`}>
                    {product.name}
                  </div>
                  <div className={`text-xs ${
                    product.available ? 'text-green-800' : 'text-gray-500'
                  }`}>
                    {product.description}
                  </div>
                  {!product.available && (
                    <div className="absolute top-1 right-1 text-red-800 text-xs font-bold">
                      LOCKED
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
          
          {/* Sales & Support Tools */}
          <div className="mb-6">
            <h3 className="text-green-800 text-lg font-bold uppercase tracking-wide text-center mb-4">
              Sales & Support
            </h3>
            <div className="grid grid-cols-4 gap-4">
              {saasProducts.slice(4, 8).map((product) => (
                <button
                  key={product.id}
                  onClick={() => handleSaasSelect(product.id)}
                  disabled={!product.available}
                  className={`p-4 rounded border-2 transition-all text-center relative ${
                    product.available
                      ? 'border-green-700 bg-green-100 hover:bg-green-200 cursor-pointer'
                      : 'border-gray-600 bg-gray-400 cursor-not-allowed opacity-60'
                  }`}
                  style={{ 
                    backgroundColor: product.available ? '#C8E0B0' : '#9CA3AF',
                    borderColor: product.available ? '#15803d' : '#4B5563'
                  }}
                  data-testid={`saas-${product.id}`}
                >
                  <div className="text-2xl mb-2">{product.icon}</div>
                  <div className={`font-bold text-xs mb-1 ${
                    product.available ? 'text-green-900' : 'text-gray-600'
                  }`}>
                    {product.name}
                  </div>
                  <div className={`text-xs ${
                    product.available ? 'text-green-800' : 'text-gray-500'
                  }`}>
                    {product.description}
                  </div>
                  {!product.available && (
                    <div className="absolute top-1 right-1 text-red-800 text-xs font-bold">
                      LOCKED
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
          
          {/* Back Button */}
          <div className="text-center mt-auto">
            <button
              onClick={() => setLocation('/login')}
              className="text-green-700 text-xs underline hover:text-green-600"
              data-testid="button-back"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}