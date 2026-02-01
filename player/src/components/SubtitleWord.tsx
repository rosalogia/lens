import type { Word } from "../types";

interface SubtitleWordProps {
  word: Word;
  showEnglish: boolean;
  onClick: () => void;
}

export function SubtitleWord({ word, showEnglish, onClick }: SubtitleWordProps) {
  const isPunctuation = !word.pinyin;

  if (isPunctuation) {
    return <span className="text-white text-2xl">{word.word}</span>;
  }

  return (
    <span
      className="relative inline-block cursor-pointer group text-2xl text-white px-0.5"
      onClick={onClick}
    >
      {/* Pinyin tooltip on hover */}
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 text-sm text-white bg-black/80 rounded px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
        {word.pinyin}
      </span>

      {word.word}

      {/* English translation on click */}
      {showEnglish && (
        <span className="absolute top-full left-1/2 -translate-x-1/2 mt-1 text-sm text-green-300 whitespace-nowrap pointer-events-none">
          {word.english}
        </span>
      )}
    </span>
  );
}
