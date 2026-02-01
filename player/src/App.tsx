import { useEffect, useRef, useState, useCallback } from "react";
import type { EpisodeData } from "./types";
import { useSubtitleSync } from "./hooks/useSubtitleSync";
import { VideoPlayer } from "./components/VideoPlayer";
import { VideoControls } from "./components/VideoControls";
import { SubtitleBar } from "./components/SubtitleBar";

function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [episode, setEpisode] = useState<EpisodeData | null>(null);
  const [overlapPx, setOverlapPx] = useState(0);

  useEffect(() => {
    fetch("/data/episode_1/subtitles.json")
      .then((r) => r.json())
      .then(setEpisode);
  }, []);

  const activeSubtitle = useSubtitleSync(
    videoRef,
    episode?.subtitles ?? []
  );

  const updateOverlap = useCallback(() => {
    const video = videoRef.current;
    if (!video || !episode) return;
    const renderedHeight = video.clientHeight;
    const blackBarRatio = (episode.resolution.height - episode.crop_y) / episode.resolution.height;
    setOverlapPx(Math.round(renderedHeight * blackBarRatio));
  }, [episode]);

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

  if (!episode) {
    return (
      <div className="min-h-screen bg-neutral-900 text-white flex items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-900 flex flex-col items-center pt-8">
      <div
        ref={containerRef}
        className="w-full max-w-3xl flex flex-col bg-black [&:fullscreen]:max-w-none [&:fullscreen]:justify-center"
      >
        <VideoPlayer
          ref={videoRef}
          src="/videos/episode_1.mp4"
        />
        <VideoControls videoRef={videoRef} containerRef={containerRef} overlapPx={overlapPx} />
        <SubtitleBar subtitle={activeSubtitle} />
      </div>
    </div>
  );
}

export default App;
