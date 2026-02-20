# Lens

An interactive Chinese language learning tool for [The Legend of Luo Xiaohei](https://en.wikipedia.org/wiki/The_Legend_of_Luo_Xiao_Hei) (罗小黑战记). Extracts hardcoded Chinese subtitles from video episodes using computer vision, processes them with Claude for word segmentation, pinyin, and translation, and displays them in an interactive React player.

**Hover** a word for pinyin. **Click** for English. **?** for full sentence translation and grammar notes.

## How it works

The project has two parts: a Python **extraction pipeline** and a React **player**.

```
Source video (.flv/.mp4)
  │
  ├─ extract_subs.py     Frame sampling + perceptual hashing → unique subtitle PNGs
  │                       Auto-detects the black subtitle bar via brightness analysis
  │
  ├─ process_subs.py     Sends subtitle images to Claude Sonnet for:
  │                       OCR → word segmentation → pinyin → per-word translation
  │                       → sentence translation → grammar notes
  │
  └─ batch_process.sh    Orchestrates the pipeline for multiple episodes,
                          handles multi-part video concatenation (ffmpeg),
                          copies results to the player's public/ directory
```

The player loads the pre-generated subtitle JSON and syncs it to video playback with binary search on timestamps.

### Subtitle data format

Each episode produces a `subtitles.json` like this:

```json
{
  "video": "episode_2.mp4",
  "resolution": { "width": 1920, "height": 1080 },
  "crop_y": 906,
  "subtitles": [
    {
      "start": "00:00:37.500",
      "end": "00:00:39.000",
      "text": "走，小黑。",
      "translation": "Let's go, Xiao Hei.",
      "grammar_notes": "",
      "words": [
        { "word": "走", "pinyin": "zǒu", "english": "go/let's go" },
        { "word": "，", "pinyin": "", "english": "," },
        { "word": "小黑", "pinyin": "Xiǎo Hēi", "english": "Xiao Hei (name)" },
        { "word": "。", "pinyin": "", "english": "." }
      ]
    }
  ]
}
```

## Player features

- Episode selector grid
- Custom video controls with scrub bar, volume, and fullscreen
- Interactive subtitle overlay positioned over the original hardcoded subtitles
- Hover-for-pinyin tooltips on each word
- Click-for-English translation on each word
- **?** button for full sentence translation and grammar notes
- **Study mode** — auto-pauses after each subtitle so you can review
- Replay / skip-to-next-subtitle buttons
- Keyboard shortcuts: Space (play/pause), Left/Right arrows (skip 5s)

## Setup

### Prerequisites

- Python 3.13+ and [uv](https://docs.astral.sh/uv/)
- Node.js 18+
- ffmpeg (for video concatenation/conversion)
- An [Anthropic API key](https://console.anthropic.com/) (for `process_subs.py`)
- Source video files for the episodes you want to process

### Extraction pipeline

```bash
# Install Python dependencies
uv sync

# Set your API key
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env

# Extract subtitle frames from a video
uv run python extract_subs.py path/to/episode.flv -o out/episode_1

# Process with Claude (OCR + segmentation + pinyin + translation)
uv run python process_subs.py out/episode_1/manifest.json
```

This produces `out/episode_1/subtitles.json`. Copy it to `player/public/data/episode_1/subtitles.json` for the player to use.

See `batch_process.sh` for an example of processing multiple episodes end-to-end.

### Player

```bash
cd player
npm install

# Copy your subtitle data and videos into public/
mkdir -p public/data public/videos
# cp ../out/episode_1/subtitles.json public/data/episode_1/
# cp path/to/episode_1.mp4 public/videos/

npm run dev
```

The player expects:
- `public/data/episodes.json` — episode metadata (id, title, titleEn)
- `public/data/episode_N/subtitles.json` — processed subtitle data per episode
- `public/videos/episode_N.mp4` — video files

## Project structure

```
├── extract_subs.py          # Step 1: Video → unique subtitle frame PNGs
├── process_subs.py          # Step 2: Subtitle PNGs → structured JSON via Claude
├── batch_process.sh         # Orchestrates the full pipeline for episodes 2-12
├── PLAN.org                 # Original design document
├── pyproject.toml           # Python dependencies
│
└── player/                  # React + TypeScript + Vite + Tailwind
    ├── src/
    │   ├── App.tsx              # Main app — episode selection + player layout
    │   ├── types.ts             # TypeScript interfaces (Word, Subtitle, EpisodeData)
    │   ├── components/
    │   │   ├── EpisodeSelector  # Grid of episode buttons
    │   │   ├── VideoPlayer      # HTML5 video wrapper
    │   │   ├── VideoControls    # Play/pause, scrub, volume, fullscreen, study mode
    │   │   ├── SubtitleBar      # Interactive subtitle display + navigation
    │   │   └── SubtitleWord     # Individual word with hover/click behavior
    │   └── hooks/
    │       └── useSubtitleSync  # Binary search sync of subtitles to video time
    └── public/                  # Runtime data (not in repo)
        ├── data/                # episodes.json + per-episode subtitles.json
        └── videos/              # Episode .mp4 files
```

## Notes

- Video files and extracted subtitle data are not included in this repository
- The extraction pipeline was designed for videos with white Chinese text on a black subtitle bar
- `extract_subs.py` uses perceptual hashing (imagehash) to deduplicate consecutive identical frames
- `process_subs.py` sends images in batches of 25 to Claude and knows character names from the show (小黑, 小白, 无限, 风息, etc.)
