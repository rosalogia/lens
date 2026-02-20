interface Episode {
  id: number;
  title: string;
  titleEn: string;
}

interface EpisodeSelectorProps {
  episodes: Episode[];
  currentEpisodeId: number | null;
  onSelect: (episodeId: number) => void;
}

export function EpisodeSelector({ episodes, currentEpisodeId, onSelect }: EpisodeSelectorProps) {
  return (
    <div className="w-full max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-bold text-white mb-2">罗小黑战记</h1>
      <p className="text-neutral-400 mb-6">The Legend of Luo Xiaohei</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {episodes.map((ep) => (
          <button
            key={ep.id}
            onClick={() => onSelect(ep.id)}
            className={`p-3 rounded-lg text-left transition-colors ${
              currentEpisodeId === ep.id
                ? "bg-white/20 ring-2 ring-white/50"
                : "bg-white/10 hover:bg-white/15"
            }`}
          >
            <div className="text-white font-medium">{ep.title}</div>
            <div className="text-neutral-400 text-sm">{ep.titleEn}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
