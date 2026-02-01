export interface Word {
  word: string;
  pinyin: string;
  english: string;
}

export interface Subtitle {
  start: string;
  end: string;
  text: string;
  translation: string;
  grammar_notes: string;
  words: Word[];
}

export interface EpisodeData {
  video: string;
  resolution: { width: number; height: number };
  crop_y: number;
  subtitles: Subtitle[];
}

/** Parse "HH:MM:SS.mmm" to seconds */
export function parseTimestamp(ts: string): number {
  const [h, m, rest] = ts.split(":");
  const [s, ms] = rest.split(".");
  return parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(s) + parseInt(ms) / 1000;
}
