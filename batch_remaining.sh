#!/bin/bash
set -e

cd /Users/bikachuu/Projects/luo-xiaohei-subs

SRC="/Users/bikachuu/Projects/luo-xiaohei-subs/episodes/1~28集"
OUT="/Users/bikachuu/Projects/luo-xiaohei-subs/out"
PLAYER_DATA="/Users/bikachuu/Projects/luo-xiaohei-subs/player/public/data"
PLAYER_VIDEOS="/Users/bikachuu/Projects/luo-xiaohei-subs/player/public/videos"

mkdir -p "$OUT" "$PLAYER_DATA" "$PLAYER_VIDEOS"

process_episode() {
    local ep_num=$1
    local src_file=$2

    echo "=== Processing Episode $ep_num ==="

    # Extract subtitles
    uv run python extract_subs.py "$src_file" -o "$OUT/episode_$ep_num"

    # Process with Sonnet
    uv run python process_subs.py "$OUT/episode_$ep_num/manifest.json"

    # Copy to player
    mkdir -p "$PLAYER_DATA/episode_$ep_num"
    cp "$OUT/episode_$ep_num/subtitles.json" "$PLAYER_DATA/episode_$ep_num/"

    # Convert to mp4 for player (if flv)
    if [[ "$src_file" == *.flv ]]; then
        ffmpeg -y -i "$src_file" -c copy "$PLAYER_VIDEOS/episode_$ep_num.mp4" 2>/dev/null
    else
        cp "$src_file" "$PLAYER_VIDEOS/episode_$ep_num.mp4"
    fi

    echo "=== Episode $ep_num done ==="
    echo
}

concat_and_process() {
    local ep_num=$1
    shift
    local parts=("$@")
    local concat_file="$OUT/episode_${ep_num}_concat.flv"

    echo "=== Concatenating Episode $ep_num (${#parts[@]} parts) ==="

    # Create concat list file
    local list_file="$OUT/concat_list_$ep_num.txt"
    > "$list_file"
    for part in "${parts[@]}"; do
        echo "file '$part'" >> "$list_file"
    done

    # Concatenate
    ffmpeg -y -f concat -safe 0 -i "$list_file" -c copy "$concat_file" 2>/dev/null

    process_episode "$ep_num" "$concat_file"
}

# Episodes 3-7: single files
process_episode 3 "$SRC/第3集 嘿.flv"
process_episode 4 "$SRC/04.flv"
process_episode 5 "$SRC/第5集 - 唷.flv"
process_episode 6 "$SRC/第6集 - 阿根.flv"
process_episode 7 "$SRC/第7集 - 比丢.flv"

# Episode 8: 08.flv appears to be part 1, 第8集 - 深山-0002.flv is part 2
concat_and_process 8 "$SRC/08.flv" "$SRC/第8集 - 深山-0002.flv"

# Episodes 9-12: multi-part
concat_and_process 9 "$SRC/第9集 - 谛听-0001.flv" "$SRC/第9集 - 谛听-0002.flv"
concat_and_process 10 "$SRC/第10集 - 老君-0001.flv" "$SRC/第10集 - 老君-0002.flv"
concat_and_process 11 "$SRC/第11集 - 蓝溪镇-0001.flv" "$SRC/第11集 - 蓝溪镇-0002.flv"
concat_and_process 12 "$SRC/第12集-0001.flv" "$SRC/第12集-0002.flv" "$SRC/第12集-0003.flv"

echo "All episodes 3-12 processed!"
