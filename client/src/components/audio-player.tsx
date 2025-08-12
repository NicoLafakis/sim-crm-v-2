import { useEffect } from 'react';
import { useAudio } from '@/hooks/use-audio';
import { useSession } from '@/hooks/use-session';
import musicFile from '@assets/linkb_1755002236735.mp3';

interface AudioPlayerProps {
  className?: string;
}

export function AudioPlayer({ className = '' }: AudioPlayerProps) {
  const { user } = useSession();
  const { isPlaying, volume, play, pause, toggle, setVolume } = useAudio(musicFile, 0.8);

  // Auto-start music and adjust volume based on login state
  useEffect(() => {
    if (user) {
      // User is logged in - reduce volume to 40%
      setVolume(0.4);
    } else {
      // User not logged in - keep at 80%
      setVolume(0.8);
    }
  }, [user, setVolume]);

  // Auto-play music when user interacts with the page
  useEffect(() => {
    const handleUserInteraction = () => {
      if (!isPlaying) {
        play();
      }
      // Remove listeners after first interaction
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };

    // Listen for any user interaction to enable autoplay
    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);

    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };
  }, [play, isPlaying]);

  const handleVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const sliderValue = parseFloat(event.target.value);
    // Reverse the slider direction: 0 at top = max volume, 1 at bottom = min volume
    const newVolume = 1 - sliderValue;
    setVolume(newVolume);
  };

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
      <div 
        className="bg-opacity-80 backdrop-blur-sm rounded-lg p-3 border-2"
        style={{ 
          backgroundColor: 'rgba(34, 78, 34, 0.9)',
          borderColor: 'rgb(70, 120, 70)',
        }}
      >
        {/* Volume Control */}
        <div className="flex flex-col items-center space-y-2">
          <div 
            className="text-xs font-bold uppercase tracking-wide"
            style={{ color: 'rgb(180, 200, 120)' }}
          >
            ♪ Vol
          </div>
          
          {/* Vertical Volume Slider */}
          <div className="flex flex-col items-center h-20">
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={1 - volume}
              onChange={handleVolumeChange}
              className="volume-slider h-16 w-4"
              style={{
                writingMode: 'vertical-lr' as const,
                WebkitAppearance: 'slider-vertical' as const,
                width: '16px',
                height: '64px',
                background: 'transparent',
                outline: 'none',
                border: 'none',
              }}
              data-testid="volume-slider"
            />
          </div>
          
          {/* Volume Percentage */}
          <div 
            className="text-xs"
            style={{ color: 'rgb(180, 200, 120)' }}
          >
            {Math.round(volume * 100)}%
          </div>
          
          {/* Play Status Indicator */}
          <div 
            className="text-xs cursor-pointer"
            style={{ color: isPlaying ? 'rgb(100, 255, 100)' : 'rgb(255, 100, 100)' }}
            onClick={toggle}
            title={isPlaying ? 'Pause Music' : 'Play Music'}
          >
            {isPlaying ? '▶' : '⏸'}
          </div>
        </div>
      </div>
    </div>
  );
}