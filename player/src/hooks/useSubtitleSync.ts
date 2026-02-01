import { useEffect, useRef, useState } from "react";
import type { Subtitle } from "../types";
import { parseTimestamp } from "../types";

interface ParsedSubtitle {
  startSec: number;
  endSec: number;
  subtitle: Subtitle;
}

function binarySearch(parsed: ParsedSubtitle[], time: number): number {
  let lo = 0;
  let hi = parsed.length - 1;
  let result = -1;

  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    if (parsed[mid].startSec <= time) {
      result = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  if (result >= 0 && time < parsed[result].endSec) {
    return result;
  }
  return -1;
}

export function useSubtitleSync(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  subtitles: Subtitle[]
): Subtitle | null {
  const parsedRef = useRef<ParsedSubtitle[]>([]);
  const indexRef = useRef(-1);
  const [active, setActive] = useState<Subtitle | null>(null);

  // Pre-parse timestamps once when subtitles change
  useEffect(() => {
    parsedRef.current = subtitles.map((s) => ({
      startSec: parseTimestamp(s.start),
      endSec: parseTimestamp(s.end),
      subtitle: s,
    }));
    indexRef.current = -1;
    setActive(null);
  }, [subtitles]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const parsed = parsedRef.current;

    function updateFromTime() {
      const time = video!.currentTime;
      const idx = indexRef.current;

      // Check if current index is still valid
      if (idx >= 0 && idx < parsed.length) {
        const cur = parsed[idx];
        if (time >= cur.startSec && time < cur.endSec) {
          return; // still showing the right subtitle
        }
        // Check next subtitle (normal playback advance)
        const next = idx + 1;
        if (next < parsed.length && time >= parsed[next].startSec && time < parsed[next].endSec) {
          indexRef.current = next;
          setActive(parsed[next].subtitle);
          return;
        }
      }

      // Fall through: gap or index invalid — check if we're in a gap after current
      if (idx >= 0 && idx < parsed.length - 1) {
        const curEnd = parsed[idx].endSec;
        const nextStart = parsed[idx + 1].startSec;
        if (time >= curEnd && time < nextStart) {
          indexRef.current = idx; // keep index, just clear display
          setActive(null);
          return;
        }
      }

      // Binary search fallback (seek or first load)
      const found = binarySearch(parsed, time);
      indexRef.current = found;
      setActive(found >= 0 ? parsed[found].subtitle : null);
    }

    video.addEventListener("timeupdate", updateFromTime);
    video.addEventListener("seeked", updateFromTime);

    return () => {
      video.removeEventListener("timeupdate", updateFromTime);
      video.removeEventListener("seeked", updateFromTime);
    };
  }, [videoRef, subtitles]);

  return active;
}
