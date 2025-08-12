import { useEffect, useRef, useCallback } from 'react';
import { useAudioStore } from './use-audio-store';

export function useAudio(src: string, initialVolume: number = 0.8) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const {
    isPlaying,
    volume,
    duration,
    currentTime,
    userHasInteracted,
    shouldAutoPlay,
    setIsPlaying,
    setVolume: setStoreVolume,
    setDuration,
    setCurrentTime,
    setUserHasInteracted,
    setShouldAutoPlay,
  } = useAudioStore();

  // Initialize audio element
  useEffect(() => {
    const audio = new Audio(src);
    audio.loop = true;
    audio.volume = volume;
    audio.preload = 'auto';
    audioRef.current = audio;

    const updateTime = () => {
      setCurrentTime(audio.currentTime);
      setDuration(audio.duration || 0);
    };

    const updateLoadedData = () => {
      setDuration(audio.duration || 0);
    };

    const handlePlay = () => {
      setIsPlaying(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadeddata', updateLoadedData);
    audio.addEventListener('loadedmetadata', updateLoadedData);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadeddata', updateLoadedData);
      audio.removeEventListener('loadedmetadata', updateLoadedData);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.pause();
      audio.src = '';
    };
  }, [src, volume, setCurrentTime, setDuration, setIsPlaying]);

  const play = useCallback(async () => {
    if (audioRef.current && !isPlaying) {
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (error) {
        console.warn('Audio play failed:', error);
      }
    }
  }, [isPlaying, setIsPlaying]);

  const pause = useCallback(() => {
    if (audioRef.current && isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, [isPlaying, setIsPlaying]);

  const setVolume = useCallback((newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    if (audioRef.current) {
      audioRef.current.volume = clampedVolume;
    }
    setStoreVolume(clampedVolume);
  }, [setStoreVolume]);

  const toggle = useCallback(async () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        try {
          await audioRef.current.play();
        } catch (error) {
          console.warn('Audio play failed:', error);
        }
      }
    }
  }, [isPlaying]);

  // Auto-resume music if it was playing before
  useEffect(() => {
    if (audioRef.current && userHasInteracted && shouldAutoPlay && isPlaying) {
      audioRef.current.play().catch(error => {
        console.warn('Auto-resume failed:', error);
      });
    }
  }, [userHasInteracted, shouldAutoPlay, isPlaying]);

  return {
    isPlaying,
    volume,
    duration,
    currentTime,
    userHasInteracted,
    shouldAutoPlay,
    play,
    pause,
    toggle,
    setVolume,
    setUserHasInteracted,
    setShouldAutoPlay,
  };
}