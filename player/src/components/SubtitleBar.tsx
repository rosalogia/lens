import { useState, useEffect } from "react";
import type { Subtitle } from "../types";
import { SubtitleWord } from "./SubtitleWord";

interface SubtitleBarProps {
  subtitle: Subtitle | null;
  overlapPx: number;
}

export function SubtitleBar({ subtitle, overlapPx }: SubtitleBarProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [activeWordIndex, setActiveWordIndex] = useState<number | null>(null);

  // Reset all state when the subtitle changes
  useEffect(() => {
    setShowDetails(false);
    setActiveWordIndex(null);
  }, [subtitle?.start]);

  function handleWordClick(index: number) {
    setShowDetails(false);
    setActiveWordIndex((prev) => (prev === index ? null : index));
  }

  function handleDetailsClick() {
    setActiveWordIndex(null);
    setShowDetails((prev) => !prev);
  }

  return (
    <div
      className="bg-black relative z-10 py-4"
      style={{ marginTop: `-${overlapPx}px` }}
    >
      {subtitle && (
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-0.5">
            {subtitle.words.map((word, i) => (
              <SubtitleWord
                key={`${subtitle.start}-${i}`}
                word={word}
                showEnglish={activeWordIndex === i}
                onClick={() => handleWordClick(i)}
              />
            ))}
            <button
              onClick={handleDetailsClick}
              className="ml-3 w-6 h-6 rounded-full bg-white/15 hover:bg-white/25 text-white/60 hover:text-white text-xs flex items-center justify-center transition-colors shrink-0"
              title="Show translation"
            >
              ?
            </button>
          </div>

          {showDetails && (
            <div className="text-center px-4 max-w-xl space-y-1">
              <p className="text-green-300 text-sm">{subtitle.translation}</p>
              {subtitle.grammar_notes && (
                <p className="text-neutral-400 text-xs italic">{subtitle.grammar_notes}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
