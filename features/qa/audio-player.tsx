"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Icon } from "@iconify/react";

export interface AudioPlayerProps {
  src: string;
  durationMs?: number;
  className?: string;
  onEnded?: () => void;
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function AudioPlayer({
  src,
  durationMs,
  className = "",
  onEnded,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [loadedDuration, setLoadedDuration] = useState<number | null>(null);
  const [prevSrc, setPrevSrc] = useState(src);

  // Adjust state during render when src changes (React recommended pattern)
  if (src !== prevSrc) {
    setPrevSrc(src);
    setIsPlaying(false);
    setCurrentTime(0);
    setLoadedDuration(null);
  }

  const effectiveDuration =
    loadedDuration !== null &&
    !isNaN(loadedDuration) &&
    isFinite(loadedDuration)
      ? loadedDuration
      : durationMs
        ? durationMs / 1000
        : 0;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      if (
        audio.duration &&
        !isNaN(audio.duration) &&
        isFinite(audio.duration)
      ) {
        setLoadedDuration(audio.duration);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      onEnded?.();
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [onEnded]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  }, [isPlaying]);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  }, []);

  return (
    <div
      className={`flex flex-col gap-2 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md ${className}`}
      role="region"
      aria-label="Audio Draft Preview Player"
    >
      <audio ref={audioRef} src={src} preload="metadata" />

      <div className="flex items-center gap-4">
        {/* Play/Pause Button */}
        <button
          type="button"
          onClick={togglePlay}
          className="h-11 w-11 rounded-full bg-[#00e5cc] text-black hover:bg-[#00f5db] active:scale-95 transition-all flex items-center justify-center shrink-0 cursor-pointer shadow-md focus-visible:ring-2 focus-visible:ring-[#00e5cc] focus-visible:outline-none"
          aria-label={isPlaying ? "Pause audio draft" : "Play audio draft"}
        >
          <Icon
            icon={
              isPlaying
                ? "tabler:player-pause-filled"
                : "tabler:player-play-filled"
            }
            className="text-xl"
          />
        </button>

        {/* Scrub bar & Time */}
        <div className="flex-1 flex flex-col gap-1">
          <div className="relative flex items-center group">
            <input
              type="range"
              min={0}
              max={effectiveDuration || 1}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-2 rounded-lg bg-white/10 appearance-none cursor-pointer accent-[#00e5cc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00e5cc]"
              aria-label="Seek audio"
              aria-valuemin={0}
              aria-valuemax={effectiveDuration}
              aria-valuenow={currentTime}
              aria-valuetext={`${formatTime(currentTime)} of ${formatTime(effectiveDuration)}`}
            />
          </div>

          <div className="flex justify-between text-xs text-white/60 ">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(effectiveDuration)}</span>
          </div>
        </div>
      </div>

      {/* Visual audio bars while playing */}
      {isPlaying && (
        <div
          className="flex items-center justify-center gap-1 h-3 mt-1"
          aria-hidden="true"
        >
          <span className="w-1 bg-[#00e5cc] rounded-full animate-pulse h-2" />
          <span className="w-1 bg-[#00e5cc] rounded-full animate-pulse h-3 [animation-delay:150ms]" />
          <span className="w-1 bg-[#00e5cc] rounded-full animate-pulse h-2 [animation-delay:300ms]" />
          <span className="w-1 bg-[#00e5cc] rounded-full animate-pulse h-3.5 [animation-delay:75ms]" />
          <span className="w-1 bg-[#00e5cc] rounded-full animate-pulse h-2.5 [animation-delay:225ms]" />
        </div>
      )}
    </div>
  );
}
