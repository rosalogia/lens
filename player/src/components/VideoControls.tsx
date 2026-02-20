import { useEffect, useState, useCallback } from "react";
import {
  MdPlayArrow,
  MdPause,
  MdVolumeUp,
  MdVolumeOff,
  MdFullscreen,
  MdFullscreenExit,
  MdMenuBook,
} from "react-icons/md";

interface VideoControlsProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  overlapPx: number;
  autoPause: boolean;
  onAutoPauseChange: (value: boolean) => void;
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function VideoControls({ videoRef, containerRef, overlapPx, autoPause, onAutoPauseChange }: VideoControlsProps) {
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showVolume, setShowVolume] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onTimeUpdate = () => setCurrentTime(video.currentTime);
    const onLoadedMetadata = () => setDuration(video.duration);
    const onVolumeChange = () => {
      setVolume(video.volume);
      setMuted(video.muted);
    };

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("volumechange", onVolumeChange);

    // Init from current state
    if (video.duration) setDuration(video.duration);
    setVolume(video.volume);
    setMuted(video.muted);

    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("volumechange", onVolumeChange);
    };
  }, [videoRef]);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  }, [videoRef]);

  const handleSeek = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const video = videoRef.current;
      if (!video) return;
      video.currentTime = parseFloat(e.target.value);
    },
    [videoRef]
  );

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
  }, [videoRef]);

  const handleVolume = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const video = videoRef.current;
      if (!video) return;
      video.volume = parseFloat(e.target.value);
      if (video.muted && parseFloat(e.target.value) > 0) {
        video.muted = false;
      }
    },
    [videoRef]
  );

  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      container.requestFullscreen();
    }
  }, [containerRef]);

  return (
    <div
      className="bg-neutral-900 flex items-center gap-2 px-3 h-10 select-none relative z-10"
      style={{ marginTop: `-${overlapPx}px` }}
    >
      {/* Play/Pause */}
      <button
        onClick={togglePlay}
        className="text-white hover:text-neutral-300 transition-colors"
      >
        {playing ? <MdPause size={24} /> : <MdPlayArrow size={24} />}
      </button>

      {/* Time */}
      <span className="text-neutral-400 text-xs tabular-nums whitespace-nowrap">
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>

      {/* Scrub bar */}
      <input
        type="range"
        min={0}
        max={duration || 0}
        step={0.1}
        value={currentTime}
        onChange={handleSeek}
        className="flex-1 h-1 accent-white cursor-pointer"
      />

      {/* Volume */}
      <div
        className="relative flex items-center"
        onMouseEnter={() => setShowVolume(true)}
        onMouseLeave={() => setShowVolume(false)}
      >
        <button
          onClick={toggleMute}
          className="text-white hover:text-neutral-300 transition-colors"
        >
          {muted || volume === 0 ? (
            <MdVolumeOff size={22} />
          ) : (
            <MdVolumeUp size={22} />
          )}
        </button>
        {showVolume && (
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={muted ? 0 : volume}
            onChange={handleVolume}
            className="w-20 h-1 accent-white cursor-pointer ml-1"
          />
        )}
      </div>

      {/* Study Mode (auto-pause) */}
      <button
        onClick={() => onAutoPauseChange(!autoPause)}
        className={`transition-colors ${autoPause ? "text-green-400 hover:text-green-300" : "text-white/50 hover:text-white"}`}
        title={autoPause ? "Study mode ON (pauses after each subtitle)" : "Study mode OFF"}
      >
        <MdMenuBook size={22} />
      </button>

      {/* Fullscreen */}
      <button
        onClick={toggleFullscreen}
        className="text-white hover:text-neutral-300 transition-colors"
      >
        {isFullscreen ? (
          <MdFullscreenExit size={24} />
        ) : (
          <MdFullscreen size={24} />
        )}
      </button>
    </div>
  );
}
