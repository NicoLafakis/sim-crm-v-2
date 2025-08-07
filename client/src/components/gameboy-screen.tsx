import { ReactNode } from 'react';

interface GameBoyScreenProps {
  children: ReactNode;
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
}

export default function GameBoyScreen({ 
  children, 
  title, 
  showBack = false, 
  onBack 
}: GameBoyScreenProps) {
  return (
    <div className="h-full flex flex-col">
      {title && (
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-gameboy-bg text-sm" data-testid="screen-title">
            {title}
          </h2>
          {showBack && (
            <button 
              onClick={onBack}
              className="text-gameboy-bg text-xs hover:opacity-80"
              data-testid="button-back"
            >
              BACK
            </button>
          )}
        </div>
      )}
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
}
