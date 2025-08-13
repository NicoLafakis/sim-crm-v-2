import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { useSession } from '@/hooks/use-session';
import { apiRequest } from '@/lib/queryClient';

export default function RecordFrequency() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, session } = useSession();
  
  const [autoMode, setAutoMode] = useState(true); // Always auto mode for free tier
  const [autoValue, setAutoValue] = useState(30);
  const [values, setValues] = useState([30, 30, 30, 30, 30]);
  const [customObjects, setCustomObjects] = useState(false);
  const [customFields, setCustomFields] = useState(false);
  const [specificOwnership, setSpecificOwnership] = useState(false);
  const [distributionWeights, setDistributionWeights] = useState(false);
  const [timeSpan, setTimeSpan] = useState('90 days');
  
  const labels = ['Contacts', 'Companies', 'Deals', 'Tickets', 'Notes'];
  const disabledLabels = ['Tasks', 'Calls'];
  const maxTotal = 150;
  const recordsDisplay = `${values.reduce((a, b) => a + b, 0)} / ${maxTotal}`;

  useEffect(() => {
    if (autoMode) {
      const newValues = Array(5).fill(autoValue);
      setValues(newValues);
    }
  }, [autoValue, autoMode]);

  const handleSliderChange = (index: number, newValue: number) => {
    if (autoMode) return;
    
    const val = parseInt(newValue.toString());
    const newValues = [...values];
    const otherIndices = [0, 1, 2, 3, 4].filter(i => i !== index);
    const currentOthersSum = otherIndices.reduce((sum, i) => sum + newValues[i], 0);
    
    if (val + currentOthersSum <= maxTotal) {
      newValues[index] = val;
    } else {
      newValues[index] = maxTotal - currentOthersSum;
    }
    
    setValues(newValues);
  };

  const handleAutoChange = (newValue: number) => {
    const val = parseInt(newValue.toString());
    const maxPerSlider = 30; // Fixed max for auto mode
    const limitedValue = Math.min(val, maxPerSlider);
    setAutoValue(limitedValue);
  };

  const handleStartSimulation = async () => {
    if (!user || !session) {
      return;
    }

    const totalRecords = values.reduce((a, b) => a + b, 0);
    
    // Convert timeSpan to duration_days
    const getDurationDays = (timeSpan: string): number => {
      const numericValue = parseInt(timeSpan.split(' ')[0]);
      return numericValue;
    };

    // Build the simulation settings for backend API
    const simulationSettings = {
      theme: session?.selectedTheme || "generic",
      industry: session?.selectedIndustry || "business", 
      duration_days: getDurationDays(timeSpan),
      timeSpan: timeSpan,
      record_distribution: {
        contacts: values[0],
        companies: values[1],
        deals: values[2],
        tickets: values[3],
        notes: values[4]
      }
    };

    try {
      // Call backend API which will handle configuration saving
      const response: any = await apiRequest('POST', '/api/simulation/start', {
        userId: user.id,
        settings: simulationSettings
      });

      console.log('AI processing completed:', response);
      
      // Navigate to progress page to show AI strategy results
      setLocation('/progress');
      
    } catch (error) {
      console.error('Configuration save error:', error);
      toast({
        title: "Configuration Failed",
        description: `Failed to save configuration: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen font-gameboy flex items-center justify-center" 
         style={{ 
           backgroundColor: '#e8e8e8',
           backgroundImage: `
             linear-gradient(to right, rgba(176, 176, 176, 0.3) 1px, transparent 1px),
             linear-gradient(to bottom, rgba(176, 176, 176, 0.3) 1px, transparent 1px)
           `,
           backgroundSize: '16px 16px'
         }}>
      <div className="simulation-container" style={{
        background: '#6c7b7f',
        border: '2px solid #0f1419',
        padding: '20px',
        width: '1000px',
        maxWidth: '95vw',
        fontFamily: "'Courier New', monospace",
        boxShadow: '0 10px 30px rgba(0,0,0,0.8)',
        userSelect: 'none'
      }}>

        <style>{`
          .title {
            color: #e8e8e8;
            font-size: 32px;
            font-weight: bold;
            text-align: center;
            margin-bottom: 20px;
            text-shadow: 0 0 20px rgba(232, 232, 232, 0.5);
            letter-spacing: 2px;
          }

          .header-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
            color: #e8e8e8;
            font-size: 14px;
          }

          .player-info {
            font-weight: bold;
          }

          .records-info {
            font-weight: bold;
          }

          .sliders-grid {
            display: grid;
            grid-template-columns: repeat(8, 1fr);
            gap: 15px;
            margin-bottom: 30px;
            padding: 20px;
            background: #6c7b7f;
            border: 1px solid #2d3748;
            width: 100%;
            overflow-x: auto;
          }

          .slider-column {
            display: flex;
            flex-direction: column;
            align-items: center;
            position: relative;
            min-width: 70px;
            flex: 1;
          }

          .slider-column.disabled {
            opacity: 0.3;
            pointer-events: none;
          }

          .slider-container {
            height: 180px;
            width: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
          }

          .slider-track {
            width: 8px;
            height: 160px;
            background: #2d3e2d;
            border: 1px solid #4a5568;
            position: relative;
          }

          .slider-track.active {
            background: linear-gradient(180deg, #2d3e2d 0%, #1e2b1e 100%);
            box-shadow: 0 0 10px rgba(45, 62, 45, 0.3);
          }

          .slider-track.disabled-track {
            background: #1a1f2e;
            border: 1px solid #2d3748;
          }

          .slider-thumb {
            position: absolute;
            width: 24px;
            height: 12px;
            background: #8b0000;
            border: 1px solid #a50000;
            cursor: grab;
            left: 50%;
            transform: translateX(-50%);
            transition: bottom 0.1s ease-out;
            pointer-events: none;
          }

          .slider-thumb.disabled-thumb {
            background: #4a5568;
            border: 1px solid #2d3748;
            cursor: default;
            transition: none;
          }

          .slider-input {
            position: absolute;
            width: 100%;
            height: 100%;
            opacity: 0;
            cursor: grab;
            -webkit-appearance: slider-vertical;
            writing-mode: vertical-lr;
            transform: rotate(180deg);
          }

          .slider-value {
            color: #2d3e2d;
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 12px;
            min-height: 24px;
            text-shadow: 0 0 5px rgba(45, 62, 45, 0.5);
          }

          .slider-label {
            color: #2d3e2d;
            font-size: 14px;
            text-align: center;
            margin-top: 12px;
            max-width: 80px;
            font-weight: bold;
          }

          .auto-toggle {
            margin-top: 10px;
          }

          .toggle-checkbox {
            display: none;
          }

          .toggle-label {
            display: block;
            width: 40px;
            height: 20px;
            background: #2d3748;
            border: 1px solid #4a5568;
            cursor: pointer;
            position: relative;
            transition: background 0.3s;
          }

          .toggle-checkbox:checked + .toggle-label {
            background: #4ade80;
            border-color: #22c55e;
            box-shadow: 0 0 10px rgba(74, 222, 128, 0.5);
          }

          .toggle-label::after {
            content: '';
            position: absolute;
            width: 16px;
            height: 16px;
            background: #718096;
            top: 1px;
            left: 1px;
            transition: all 0.3s;
          }

          .toggle-checkbox:checked + .toggle-label::after {
            background: #1a1f2e;
            left: 22px;
          }

          .checkbox-container {
            display: flex;
            align-items: center;
            gap: 5px;
          }

          .checkbox {
            width: 16px;
            height: 16px;
            background: #2d3748;
            border: 1px solid #4a5568;
            cursor: default;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0.5;
          }

          .checkbox.checked::after {
            content: '✓';
            color: #1a1f2e;
            font-weight: bold;
            font-size: 12px;
          }

          .checkbox-label {
            color: #e8e8e8;
            font-size: 14px;
            font-weight: bold;
          }

          .additional-options {
            margin-bottom: 20px;
          }

          .options-title {
            color: #e8e8e8;
            font-size: 16px;
            font-weight: bold;
            text-align: center;
            margin-bottom: 15px;
          }

          .options-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            padding: 15px;
            background: #9fb89f;
            border: 1px solid #2d3748;
          }

          .option-item {
            display: flex;
            align-items: center;
            gap: 8px;
            color: #718096;
            font-size: 12px;
          }

          .option-checkbox {
            width: 14px;
            height: 14px;
            background: #2d3748;
            border: 1px solid #4a5568;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .option-checkbox.checked::after {
            content: '✓';
            color: #4ade80;
            font-weight: bold;
            font-size: 10px;
          }

          .option-label {
            flex: 1;
          }

          .locked-indicator {
            color: #6b7280;
            font-size: 12px;
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.2s, visibility 0.2s;
            margin-top: 8px;
            text-align: center;
          }

          .slider-column:hover .locked-indicator {
            opacity: 1;
            visibility: visible;
          }

          .tooltip-container {
            position: relative;
          }

          .tooltip {
            position: absolute;
            bottom: 100%;
            left: 50%;
            transform: translateX(-50%);
            background: #1a1f2e;
            color: #fbbf24;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 11px;
            white-space: nowrap;
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.2s, visibility 0.2s;
            z-index: 1000;
            border: 1px solid #fbbf24;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
            margin-bottom: 10px;
          }

          .tooltip::after {
            content: '';
            position: absolute;
            top: 100%;
            left: 50%;
            transform: translateX(-50%);
            border: 6px solid transparent;
            border-top-color: #fbbf24;
          }

          .tooltip-container:hover .tooltip {
            opacity: 1;
            visibility: visible;
          }

          .start-button {
            width: 100%;
            background: #8b0000;
            color: #e8e8e8;
            border: 2px solid #8b0000;
            padding: 15px;
            font-size: 18px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.2s;
            box-shadow: 0 0 20px rgba(139, 0, 0, 0.3);
            letter-spacing: 1px;
          }

          .start-button:hover {
            background: #a50000;
            box-shadow: 0 0 30px rgba(139, 0, 0, 0.5);
            transform: translateY(-2px);
          }

          .start-button:active {
            transform: translateY(0);
          }

          .back-button {
            color: rgb(200, 220, 140);
            text-decoration: underline;
            background: none;
            border: none;
            cursor: pointer;
            font-family: 'Quantico';
            font-size: 0.75rem;
            line-height: 1rem;
            height: 1rem;
            margin-bottom: 20px;
            transition: opacity 0.2s;
          }

          .back-button:hover {
            opacity: 0.75;
          }

          .timespan-container {
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 20px;
            gap: 10px;
          }

          .timespan-label {
            color: #e8e8e8;
            font-family: 'Quantico';
            font-size: 14px;
            font-weight: bold;
          }

          .timespan-dropdown {
            background: #1a1f2e;
            border: 2px solid #e8e8e8;
            color: #e8e8e8;
            padding: 8px 12px;
            font-family: 'Quantico';
            font-size: 14px;
            cursor: pointer;
            outline: none;
            min-width: 120px;
          }

          .timespan-dropdown:hover {
            background: #2d3748;
            box-shadow: 0 0 10px rgba(232, 232, 232, 0.3);
          }

          .timespan-dropdown option {
            background: #1a1f2e;
            color: #e8e8e8;
            font-family: 'Quantico';
          }

          .timespan-dropdown option:disabled {
            color: #6b7280;
            background: #0f1419;
          }
        `}</style>

        <div className="title">Record Frequency</div>

        <div className="header-row text-[18px]">
          <div className="player-info">Player: {localStorage.getItem('username') || 'Guest'}</div>
          <div className="records-info">Records: {recordsDisplay}</div>
        </div>

        {/* TimeSpan Dropdown */}
        <div className="timespan-container">
          <label className="timespan-label text-[16px]" htmlFor="timespan-select">Time Span:</label>
          <select
            id="timespan-select"
            className="timespan-dropdown bg-[#2d3e2d]"
            value={timeSpan}
            onChange={(e) => setTimeSpan(e.target.value)}
            data-testid="dropdown-timespan"
          >
            <option value="1 day">1 day</option>
            <option value="7 days">7 days</option>
            <option value="14 days">14 days</option>
            <option value="30 days">30 days</option>
            <option value="60 days">60 days</option>
            <option value="90 days">90 days</option>
            <option value="120 days" disabled>120 days (unavailable)</option>
            <option value="190 days" disabled>190 days (unavailable)</option>
            <option value="Custom" disabled>Custom (unavailable)</option>
          </select>
          <div className="tooltip-container" style={{ marginLeft: '10px' }}>
            <span style={{ 
              color: '#e8e8e8', 
              cursor: 'help',
              fontSize: '18px',
              fontWeight: 'bold',
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              border: '2px solid #e8e8e8',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>i</span>
            <div className="tooltip pl-[12px] pr-[12px] bg-[#2d3e2d]" style={{ 
              maxWidth: '300px', 
              whiteSpace: 'normal', 
              textAlign: 'center',
              background: '#1a1f2e',
              color: '#e8e8e8',
              border: '1px solid #e8e8e8'
            }}>
              Time Span sets the total duration for CRM simulation. Records are distributed evenly across this period. Example: 30 contacts over 30 days = 1 contact per day.
            </div>
          </div>
        </div>

        <div className="sliders-grid bg-[#9fb89f]">
          {/* Auto Slider */}
          <div className="slider-column">
            <div className="slider-value">{autoMode ? autoValue : 0}</div>
            <div className="slider-container">
              <div className={`slider-track ${autoMode ? 'active' : ''}`}></div>
              <input
                type="range"
                className="slider-input"
                min="0"
                max="30"
                step="1"
                value={autoMode ? autoValue : 0}
                onChange={(e) => handleAutoChange(parseInt(e.target.value))}
                disabled={!autoMode}
                data-testid="slider-auto"
              />
              <div 
                className={`slider-thumb ${!autoMode ? 'disabled-thumb' : ''}`}
                style={{ bottom: `${(autoMode ? autoValue : 0) / 30 * 80}%` }}
              />
            </div>
            <div className="slider-label">Auto</div>
            <div className="auto-toggle">
              <input 
                type="checkbox" 
                className="toggle-checkbox" 
                checked={autoMode}
                disabled={true}
                readOnly
              />
              <label className="toggle-label"></label>
            </div>
          </div>

          {/* Manual Sliders - Requires Level 2 */}
          {labels.map((label, index) => (
            <div 
              key={index} 
              className="slider-column disabled tooltip-container" 
              title="Manual adjustment requires Level 2 subscription"
            >
              <div className="slider-value">{values[index]}</div>
              <div className="slider-container">
                <div className="slider-track disabled-track"></div>
                <input
                  type="range"
                  className="slider-input"
                  min="0"
                  max={maxTotal}
                  step="1"
                  value={values[index]}
                  onChange={(e) => handleSliderChange(index, parseInt(e.target.value))}
                  disabled={true}
                  data-testid={`slider-${label.toLowerCase()}`}
                />
                <div 
                  className="slider-thumb disabled-thumb"
                  style={{ bottom: `${values[index] / maxTotal * 80}%` }}
                />
              </div>
              <div className="slider-label">{label}</div>
              <div className="locked-indicator">Requires Level 2</div>
              <div className="tooltip">Manual adjustment available with Level 2 subscription</div>
            </div>
          ))}

          {/* Disabled Sliders */}
          {disabledLabels.map((label, index) => (
            <div key={`disabled-${index}`} className="slider-column disabled">
              <div className="slider-value">0</div>
              <div className="slider-container">
                <div className="slider-track disabled-track"></div>
                <div className="slider-thumb disabled-thumb" style={{ bottom: '0%' }} />
              </div>
              <div className="slider-label">{label}</div>
            </div>
          ))}
        </div>

        {/* Additional Options */}
        <div className="additional-options">
          <div className="options-title text-[18px]">Additional Options</div>
          <div className="options-grid">
            <div className="option-item tooltip-container" title="Custom Objects requires Level 2 subscription">
              <div 
                className="option-checkbox"
                style={{ opacity: 0.5, cursor: 'not-allowed' }}
              />
              <div className="option-label">Custom Objects</div>
              <div className="locked-indicator">Requires Level 2</div>
              <div className="tooltip">Custom Objects available with Level 2 subscription</div>
            </div>
            
            <div className="option-item tooltip-container" title="Custom Fields requires Level 2 subscription">
              <div 
                className="option-checkbox"
                style={{ opacity: 0.5, cursor: 'not-allowed' }}
              />
              <div className="option-label">Custom Fields</div>
              <div className="locked-indicator">Requires Level 2</div>
              <div className="tooltip">Custom Fields available with Level 2 subscription</div>
            </div>
            
            <div className="option-item tooltip-container" title="Specific Ownership requires Level 2 subscription">
              <div 
                className="option-checkbox"
                style={{ opacity: 0.5, cursor: 'not-allowed' }}
              />
              <div className="option-label">Specific Ownership</div>
              <div className="locked-indicator">Requires Level 2</div>
              <div className="tooltip">Specific Ownership available with Level 2 subscription</div>
            </div>
            
            <div className="option-item tooltip-container" title="Distribution Weights requires Level 2 subscription">
              <div 
                className="option-checkbox"
                style={{ opacity: 0.5, cursor: 'not-allowed' }}
              />
              <div className="option-label">Distribution Weights</div>
              <div className="locked-indicator">Requires Level 2</div>
              <div className="tooltip">Distribution Weights available with Level 2 subscription</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <button
            onClick={() => setLocation('/industry-selection')}
            className="px-6 py-2 transition-all"
            style={{ 
              color: 'rgb(200, 220, 140)',
              textDecoration: 'underline',
              fontFamily: 'Quantico',
              fontSize: '0.75rem',
              lineHeight: '1rem',
              height: '1rem'
            }}
            data-testid="button-back"
          >
            ← Back To Industries
          </button>
        </div>

        {/* Start Button */}
        <button
          onClick={handleStartSimulation}
          className="start-button"
          data-testid="button-start-simulation"
        >
          Start Simulation
        </button>
      </div>
    </div>
  );
}