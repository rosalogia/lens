import { forwardRef } from "react";

interface VideoPlayerProps {
  src: string;
}

export const VideoPlayer = forwardRef<HTMLVideoElement, VideoPlayerProps>(
  ({ src }, ref) => {
    return (
      <video
        ref={ref}
        src={src}
        className="w-full"
      />
    );
  }
);
