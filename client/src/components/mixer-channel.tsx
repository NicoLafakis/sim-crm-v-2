import { useState, useEffect } from 'react';

interface MixerChannelProps {
  name: string;
  value: number;
  onChange: (value: number) => void;
  enabled?: boolean;
  autoDistribution?: boolean;
  onAutoToggle?: (enabled: boolean) => void;
}

export default function MixerChannel({ 
  name, 
  value, 
  onChange, 
  enabled = true, 
  autoDistribution = false,
  onAutoToggle 
}: MixerChannelProps) {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value);
    setLocalValue(newValue);
    onChange(newValue);
  };

  const handleAutoToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    onAutoToggle?.(e.target.checked);
  };

  return (
    <div className={`bg-gameboy-screen-dark p-2 rounded text-center ${!enabled ? 'opacity-50' : ''}`}>
      <div className="text-gameboy-bg text-xs mb-2" data-testid={`mixer-label-${name.toLowerCase()}`}>
        {!enabled && '🔒 '}{name}
      </div>
      <input
        type="range"
        min="0"
        max="100"
        value={localValue}
        onChange={handleSliderChange}
        disabled={!enabled}
        className="w-full mb-2 mixer-slider"
        data-testid={`slider-${name.toLowerCase()}`}
      />
      <div className="text-gameboy-bg text-xs mb-1" data-testid={`value-${name.toLowerCase()}`}>
        {localValue}
      </div>
      <label className="flex items-center justify-center text-xs text-gameboy-bg">
        <input
          type="checkbox"
          checked={autoDistribution}
          onChange={handleAutoToggle}
          disabled={!enabled}
          className="mr-1"
          data-testid={`auto-${name.toLowerCase()}`}
        />
        AUTO
      </label>
    </div>
  );
}
