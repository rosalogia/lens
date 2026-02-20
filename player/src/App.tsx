import { useEffect, useRef, useState, useCallback } from "react";
import type { EpisodeData } from "./types";
import { parseTimestamp } from "./types";
import { useSubtitleSync } from "./hooks/useSubtitleSync";
import { VideoPlayer } from "./components/VideoPlayer";
import { VideoControls } from "./components/VideoControls";
import { SubtitleBar } from "./components/SubtitleBar";
import { EpisodeSelector } from "./components/EpisodeSelector";
import { MdArrowBack } from "react-icons/md";

interface EpisodeInfo {
  id: number;
  title: string;
  titleEn: string;
}

function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [episodes, setEpisodes] = useState<EpisodeInfo[]>([]);
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<number | null>(null);
  const [episodeData, setEpisodeData] = useState<EpisodeData | null>(null);
  const [overlapPx, setOverlapPx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [autoPause, setAutoPause] = useState(false);
  const prevSubtitleRef = useRef<string | null>(null);

  // Load episodes list on mount
  useEffect(() => {
    fetch("/data/episodes.json")
      .then((r) => r.json())
      .then((data) => {
        setEpisodes(data);
        setLoading(false);
      });
  }, []);

  // Load episode data when selected
  useEffect(() => {
    if (selectedEpisodeId === null) {
      setEpisodeData(null);
      return;
    }

    setLoading(true);
    fetch(`/data/episode_${selectedEpisodeId}/subtitles.json`)
      .then((r) => r.json())
      .then((data) => {
        setEpisodeData(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
        setEpisodeData(null);
      });
  }, [selectedEpisodeId]);

  const activeSubtitle = useSubtitleSync(
    videoRef,
    episodeData?.subtitles ?? []
  );

  const updateOverlap = useCallback(() => {
    const video = videoRef.current;
    if (!video || !episodeData) return;
    const renderedHeight = video.clientHeight;
    const blackBarRatio = (episodeData.resolution.height - episodeData.crop_y) / episodeData.resolution.height;
    setOverlapPx(Math.round(renderedHeight * blackBarRatio));
  }, [episodeData]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.addEventListener("loadedmetadata", updateOverlap);
    window.addEventListener("resize", updateOverlap);
    updateOverlap();

    return () => {
      video.removeEventListener("loadedmetadata", updateOverlap);
      window.removeEventListener("resize", updateOverlap);
    };
  }, [updateOverlap]);

  const handleBack = () => {
    setSelectedEpisodeId(null);
    setEpisodeData(null);
  };

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  }, []);

  const skip = useCallback((seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds));
  }, []);

  // Keyboard controls
  useEffect(() => {
    if (selectedEpisodeId === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.code) {
        case "Space":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowLeft":
          e.preventDefault();
          skip(-5);
          break;
        case "ArrowRight":
          e.preventDefault();
          skip(5);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedEpisodeId, togglePlay, skip]);

  // Auto-pause when subtitle ends
  useEffect(() => {
    const currentKey = activeSubtitle?.start ?? null;
    const prevKey = prevSubtitleRef.current;

    // Detect transition from having a subtitle to not having one
    if (autoPause && prevKey !== null && currentKey === null) {
      videoRef.current?.pause();
    }

    prevSubtitleRef.current = currentKey;
  }, [activeSubtitle, autoPause]);

  // Subtitle navigation
  const seekToSubtitleStart = useCallback(() => {
    const video = videoRef.current;
    if (!video || !activeSubtitle) return;
    video.currentTime = parseTimestamp(activeSubtitle.start);
  }, [activeSubtitle]);

  const seekToSubtitleEnd = useCallback(() => {
    const video = videoRef.current;
    if (!video || !activeSubtitle) return;
    video.currentTime = parseTimestamp(activeSubtitle.end);
  }, [activeSubtitle]);

  if (loading && episodes.length === 0) {
    return (
      <div className="min-h-screen bg-neutral-900 text-white flex items-center justify-center">
        Loading...
      </div>
    );
  }

  // Show episode selector if no episode selected
  if (selectedEpisodeId === null) {
    return (
      <div className="min-h-screen bg-neutral-900 flex flex-col items-center pt-8">
        <EpisodeSelector
          episodes={episodes}
          currentEpisodeId={selectedEpisodeId}
          onSelect={setSelectedEpisodeId}
        />
      </div>
    );
  }

  // Loading episode data
  if (loading || !episodeData) {
    return (
      <div className="min-h-screen bg-neutral-900 text-white flex items-center justify-center">
        Loading episode {selectedEpisodeId}...
      </div>
    );
  }

  const currentEpisode = episodes.find((e) => e.id === selectedEpisodeId);

  return (
    <div className="min-h-screen bg-neutral-900 flex flex-col items-center pt-4">
      {/* Header with back button and title */}
      <div className="w-full max-w-3xl flex items-center gap-3 px-4 mb-2">
        <button
          onClick={handleBack}
          className="text-white hover:text-neutral-300 transition-colors"
        >
          <MdArrowBack size={24} />
        </button>
        <div>
          <span className="text-white font-medium">{currentEpisode?.title}</span>
          <span className="text-neutral-400 text-sm ml-2">{currentEpisode?.titleEn}</span>
        </div>
      </div>

      <div
        ref={containerRef}
        className="w-full max-w-3xl flex flex-col bg-black [&:fullscreen]:max-w-none [&:fullscreen]:justify-center"
      >
        <VideoPlayer
          ref={videoRef}
          src={`/videos/episode_${selectedEpisodeId}.mp4`}
          onTogglePlay={togglePlay}
        />
        <VideoControls
          videoRef={videoRef}
          containerRef={containerRef}
          overlapPx={overlapPx}
          autoPause={autoPause}
          onAutoPauseChange={setAutoPause}
        />
        <SubtitleBar
          subtitle={activeSubtitle}
          onSeekToStart={seekToSubtitleStart}
          onSeekToEnd={seekToSubtitleEnd}
        />
      </div>
    </div>
  );
}

export default App;
