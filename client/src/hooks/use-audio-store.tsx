import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AudioState {
  isPlaying: boolean;
  volume: number;
  duration: number;
  currentTime: number;
  userHasInteracted: boolean;
  shouldAutoPlay: boolean;
}

interface AudioStore extends AudioState {
  setIsPlaying: (isPlaying: boolean) => void;
  setVolume: (volume: number) => void;
  setDuration: (duration: number) => void;
  setCurrentTime: (currentTime: number) => void;
  setUserHasInteracted: (hasInteracted: boolean) => void;
  setShouldAutoPlay: (shouldAutoPlay: boolean) => void;
}

export const useAudioStore = create<AudioStore>()(
  persist(
    (set) => ({
      // Initial state
      isPlaying: false,
      volume: 0.8,
      duration: 0,
      currentTime: 0,
      userHasInteracted: false,
      shouldAutoPlay: false,
      
      // Actions
      setIsPlaying: (isPlaying: boolean) => set({ isPlaying }),
      setVolume: (volume: number) => set({ volume }),
      setDuration: (duration: number) => set({ duration }),
      setCurrentTime: (currentTime: number) => set({ currentTime }),
      setUserHasInteracted: (userHasInteracted: boolean) => set({ userHasInteracted }),
      setShouldAutoPlay: (shouldAutoPlay: boolean) => set({ shouldAutoPlay }),
    }),
    {
      name: 'simcrm-audio',
      // Only persist certain fields, not the dynamic ones
      partialize: (state) => ({ 
        isPlaying: state.isPlaying,
        volume: state.volume,
        userHasInteracted: state.userHasInteracted,
        shouldAutoPlay: state.shouldAutoPlay
      }),
    }
  )
);