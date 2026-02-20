import { forwardRef } from "react";

interface VideoPlayerProps {
  src: string;
  onTogglePlay?: () => void;
}

export const VideoPlayer = forwardRef<HTMLVideoElement, VideoPlayerProps>(
  ({ src, onTogglePlay }, ref) => {
    return (
      <video
        ref={ref}
        src={src}
        className="w-full cursor-pointer"
        onClick={onTogglePlay}
      />
    );
  }
);
