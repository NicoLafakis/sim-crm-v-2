import { ReactNode } from 'react';

interface GameBoyConsoleProps {
  children: ReactNode;
  onDPadClick?: (direction: 'up' | 'down' | 'left' | 'right') => void;
  onActionClick?: (button: 'A' | 'B') => void;
  onStartClick?: () => void;
  onSelectClick?: () => void;
}

export default function GameBoyConsole({ 
  children, 
  onDPadClick,
  onActionClick,
  onStartClick,
  onSelectClick 
}: GameBoyConsoleProps) {
  return (
    <div className="min-h-screen bg-gameboy-bg dotted-bg flex items-center justify-center p-4 font-gameboy">
      <div 
        className="gameboy-console rounded-3xl p-8 shadow-2xl max-w-md w-full"
        style={{
          background: 'linear-gradient(145deg, hsl(71, 33%, 74%), hsl(67, 21%, 56%))'
        }}
      >
        {/* Console Header */}
        <div className="text-center mb-6">
          <div className="text-gameboy-contrast text-xl mb-2 tracking-wider">Nintendo</div>
          <div className="text-gameboy-contrast text-xs tracking-widest">GAME BOY</div>
        </div>

        {/* Game Screen */}
        <div 
          className="game-screen bg-gameboy-screen rounded-lg p-4 mb-6 min-h-80 relative overflow-hidden screen-scanlines"
          style={{ aspectRatio: '10/9' }}
        >
          {children}
        </div>

        {/* Console Controls */}
        <div className="flex justify-between items-center">
          {/* D-Pad */}
          <div className="relative">
            <div className="w-16 h-16 relative">
              <button 
                className="absolute top-0 left-1/2 transform -translate-x-1/2 w-6 h-6 gameboy-button rounded-sm"
                onClick={() => onDPadClick?.('up')}
                data-testid="dpad-up"
              />
              <button 
                className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-6 h-6 gameboy-button rounded-sm"
                onClick={() => onDPadClick?.('down')}
                data-testid="dpad-down"
              />
              <button 
                className="absolute left-0 top-1/2 transform -translate-y-1/2 w-6 h-6 gameboy-button rounded-sm"
                onClick={() => onDPadClick?.('left')}
                data-testid="dpad-left"
              />
              <button 
                className="absolute right-0 top-1/2 transform -translate-y-1/2 w-6 h-6 gameboy-button rounded-sm"
                onClick={() => onDPadClick?.('right')}
                data-testid="dpad-right"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-4 h-4 bg-gameboy-console-dark rounded-full" />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-4">
            <button 
              className="w-8 h-8 gameboy-button rounded-full flex items-center justify-center text-gameboy-contrast text-xs font-bold"
              onClick={() => onActionClick?.('B')}
              data-testid="button-b"
            >
              B
            </button>
            <button 
              className="w-8 h-8 gameboy-button rounded-full flex items-center justify-center text-gameboy-contrast text-xs font-bold"
              onClick={() => onActionClick?.('A')}
              data-testid="button-a"
            >
              A
            </button>
          </div>
        </div>

        {/* Start/Select Buttons */}
        <div className="flex justify-center space-x-6 mt-4">
          <button 
            className="px-3 py-1 gameboy-button rounded text-gameboy-contrast text-xs"
            onClick={onSelectClick}
            data-testid="button-select"
          >
            SELECT
          </button>
          <button 
            className="px-3 py-1 gameboy-button rounded text-gameboy-contrast text-xs"
            onClick={onStartClick}
            data-testid="button-start"
          >
            START
          </button>
        </div>
      </div>
    </div>
  );
}
