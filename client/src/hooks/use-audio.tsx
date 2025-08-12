import { useState, useEffect, useRef, useCallback } from 'react';

interface AudioState {
  isPlaying: boolean;
  volume: number;
  duration: number;
  currentTime: number;
}

export function useAudio(src: string, initialVolume: number = 0.8) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioState, setAudioState] = useState<AudioState>({
    isPlaying: false,
    volume: initialVolume,
    duration: 0,
    currentTime: 0,
  });

  // Initialize audio element
  useEffect(() => {
    const audio = new Audio(src);
    audio.loop = true;
    audio.volume = initialVolume;
    audio.preload = 'auto';
    audioRef.current = audio;

    const updateTime = () => {
      setAudioState(prev => ({
        ...prev,
        currentTime: audio.currentTime,
        duration: audio.duration || 0,
      }));
    };

    const updateLoadedData = () => {
      setAudioState(prev => ({
        ...prev,
        duration: audio.duration || 0,
      }));
    };

    const updatePlayState = () => {
      setAudioState(prev => ({
        ...prev,
        isPlaying: !audio.paused,
      }));
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadeddata', updateLoadedData);
    audio.addEventListener('loadedmetadata', updateLoadedData);
    audio.addEventListener('play', updatePlayState);
    audio.addEventListener('pause', updatePlayState);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadeddata', updateLoadedData);
      audio.removeEventListener('loadedmetadata', updateLoadedData);
      audio.removeEventListener('play', updatePlayState);
      audio.removeEventListener('pause', updatePlayState);
      audio.pause();
      audio.src = '';
    };
  }, [src, initialVolume]);

  const play = useCallback(async () => {
    if (audioRef.current) {
      try {
        await audioRef.current.play();
        setAudioState(prev => ({ ...prev, isPlaying: true }));
      } catch (error) {
        console.warn('Audio play failed:', error);
      }
    }
  }, []);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setAudioState(prev => ({ ...prev, isPlaying: false }));
    }
  }, []);

  const setVolume = useCallback((volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    if (audioRef.current) {
      audioRef.current.volume = clampedVolume;
    }
    setAudioState(prev => ({ ...prev, volume: clampedVolume }));
  }, []);

  const toggle = useCallback(() => {
    if (audioState.isPlaying) {
      pause();
    } else {
      play();
    }
  }, [audioState.isPlaying, play, pause]);

  return {
    ...audioState,
    play,
    pause,
    toggle,
    setVolume,
  };
}