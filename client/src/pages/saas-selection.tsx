import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';

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
    <div className="min-h-screen font-gameboy" 
         style={{ 
           backgroundColor: 'rgb(34, 78, 34)',
           backgroundImage: 'linear-gradient(rgba(50, 94, 50, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(50, 94, 50, 0.3) 1px, transparent 1px)',
           backgroundSize: '20px 20px'
         }}>
      
      {/* Header */}
      <div className="text-center pt-8 pb-6" style={{ backgroundColor: 'rgb(34, 78, 34)' }}>
        <h1 className="text-2xl font-bold uppercase tracking-wider mb-2" style={{ color: 'rgb(200, 220, 140)' }}>
          Select a SaaS Tool
        </h1>
      </div>
      
      {/* CRM Section */}
      <div className="px-8 mb-8" style={{ backgroundColor: 'rgb(34, 78, 34)' }}>
        <h2 className="text-lg font-bold uppercase tracking-wide text-center mb-6" style={{ color: 'rgb(200, 220, 140)' }}>
          CRM
        </h2>
        <div className="grid grid-cols-4 gap-6 max-w-4xl mx-auto">
          {/* HubSpot - Available */}
          <button
            onClick={() => handleSaasSelect('hubspot')}
            className="h-24 rounded border-2 border-blue-600 bg-blue-900 text-white cursor-pointer hover:bg-blue-800 text-center flex flex-col justify-center items-center transition-all"
            data-testid="saas-hubspot"
          >
            <div className="text-lg mb-1">⚙️</div>
            <div className="text-xs font-bold uppercase tracking-wide">
              HubSpot
            </div>
          </button>
          
          {/* Salesforce - Disabled */}
          <button
            onClick={() => handleSaasSelect('salesforce')}
            disabled
            className="h-24 rounded border-2 border-green-600 bg-green-800 text-green-400 cursor-not-allowed opacity-60 text-center flex flex-col justify-center items-center transition-all"
            data-testid="saas-salesforce"
          >
            <div className="text-lg mb-1">☁️</div>
            <div className="text-xs font-bold uppercase tracking-wide">
              Salesforce
            </div>
          </button>
          
          {/* Zoho CRM - Disabled */}
          <button
            onClick={() => handleSaasSelect('zoho')}
            disabled
            className="h-24 rounded border-2 border-green-600 bg-green-800 text-green-400 cursor-not-allowed opacity-60 text-center flex flex-col justify-center items-center transition-all"
            data-testid="saas-zoho"
          >
            <div className="text-lg mb-1">📊</div>
            <div className="text-xs font-bold uppercase tracking-wide">
              Zoho CRM
            </div>
          </button>
          
          {/* Pipedrive - Disabled */}
          <button
            onClick={() => handleSaasSelect('pipedrive')}
            disabled
            className="h-24 rounded border-2 border-green-600 bg-green-800 text-green-400 cursor-not-allowed opacity-60 text-center flex flex-col justify-center items-center transition-all"
            data-testid="saas-pipedrive"
          >
            <div className="text-lg mb-1">📈</div>
            <div className="text-xs font-bold uppercase tracking-wide">
              Pipedrive
            </div>
          </button>
        </div>
      </div>
      
      {/* Marketing Automation Section */}
      <div className="px-8 mb-8" style={{ backgroundColor: 'rgb(34, 78, 34)' }}>
        <h2 className="text-lg font-bold uppercase tracking-wide text-center mb-6" style={{ color: 'rgb(200, 220, 140)' }}>
          Marketing Automation
        </h2>
        <div className="grid grid-cols-4 gap-6 max-w-4xl mx-auto">
          {/* Marketo - Disabled */}
          <button
            onClick={() => handleSaasSelect('marketo')}
            disabled
            className="h-24 rounded border-2 border-green-600 bg-green-800 text-green-400 cursor-not-allowed opacity-60 text-center flex flex-col justify-center items-center transition-all"
            data-testid="saas-marketo"
          >
            <div className="text-lg mb-1">🎯</div>
            <div className="text-xs font-bold uppercase tracking-wide">
              Marketo
            </div>
          </button>
          
          {/* Mailchimp - Disabled */}
          <button
            onClick={() => handleSaasSelect('mailchimp')}
            disabled
            className="h-24 rounded border-2 border-green-600 bg-green-800 text-green-400 cursor-not-allowed opacity-60 text-center flex flex-col justify-center items-center transition-all"
            data-testid="saas-mailchimp"
          >
            <div className="text-lg mb-1">🐒</div>
            <div className="text-xs font-bold uppercase tracking-wide">
              Mailchimp
            </div>
          </button>
          
          {/* ActiveCampaign - Disabled */}
          <button
            onClick={() => handleSaasSelect('activecampaign')}
            disabled
            className="h-24 rounded border-2 border-green-600 bg-green-800 text-green-400 cursor-not-allowed opacity-60 text-center flex flex-col justify-center items-center transition-all"
            data-testid="saas-activecampaign"
          >
            <div className="text-lg mb-1">⚡</div>
            <div className="text-xs font-bold uppercase tracking-wide">
              ActiveCampaign
            </div>
          </button>
          
          {/* Klaviyo - Disabled */}
          <button
            onClick={() => handleSaasSelect('klaviyo')}
            disabled
            className="h-24 rounded border-2 border-green-600 bg-green-800 text-green-400 cursor-not-allowed opacity-60 text-center flex flex-col justify-center items-center transition-all"
            data-testid="saas-klaviyo"
          >
            <div className="text-lg mb-1">📧</div>
            <div className="text-xs font-bold uppercase tracking-wide">
              Klaviyo
            </div>
          </button>
        </div>
      </div>
      
      {/* Project Management Section */}
      <div className="px-8 mb-8" style={{ backgroundColor: 'rgb(34, 78, 34)' }}>
        <h2 className="text-lg font-bold uppercase tracking-wide text-center mb-6" style={{ color: 'rgb(200, 220, 140)' }}>
          Project Management
        </h2>
        <div className="grid grid-cols-4 gap-6 max-w-4xl mx-auto">
          {/* Monday.com - Disabled */}
          <button
            onClick={() => handleSaasSelect('monday')}
            disabled
            className="h-24 rounded border-2 border-green-600 bg-green-800 text-green-400 cursor-not-allowed opacity-60 text-center flex flex-col justify-center items-center transition-all"
            data-testid="saas-monday"
          >
            <div className="text-lg mb-1">📋</div>
            <div className="text-xs font-bold uppercase tracking-wide">
              Monday.com
            </div>
          </button>
          
          {/* Asana - Disabled */}
          <button
            onClick={() => handleSaasSelect('asana')}
            disabled
            className="h-24 rounded border-2 border-green-600 bg-green-800 text-green-400 cursor-not-allowed opacity-60 text-center flex flex-col justify-center items-center transition-all"
            data-testid="saas-asana"
          >
            <div className="text-lg mb-1">✅</div>
            <div className="text-xs font-bold uppercase tracking-wide">
              Asana
            </div>
          </button>
          
          {/* Trello - Disabled */}
          <button
            onClick={() => handleSaasSelect('trello')}
            disabled
            className="h-24 rounded border-2 border-green-600 bg-green-800 text-green-400 cursor-not-allowed opacity-60 text-center flex flex-col justify-center items-center transition-all"
            data-testid="saas-trello"
          >
            <div className="text-lg mb-1">📝</div>
            <div className="text-xs font-bold uppercase tracking-wide">
              Trello
            </div>
          </button>
          
          {/* Notion - Disabled */}
          <button
            onClick={() => handleSaasSelect('notion')}
            disabled
            className="h-24 rounded border-2 border-green-600 bg-green-800 text-green-400 cursor-not-allowed opacity-60 text-center flex flex-col justify-center items-center transition-all"
            data-testid="saas-notion"
          >
            <div className="text-lg mb-1">📄</div>
            <div className="text-xs font-bold uppercase tracking-wide">
              Notion
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}