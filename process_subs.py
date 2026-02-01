#!/usr/bin/env python3
"""Send extracted subtitle crops to Claude Sonnet for OCR + segmentation + pinyin + translation."""

import argparse
import base64
import json
import sys
from pathlib import Path

import anthropic
from dotenv import load_dotenv

load_dotenv()

SYSTEM_PROMPT = """You are a Chinese subtitle processing tool for the animated show "The Legend of Luo Xiaohei" (罗小黑战记).

You will receive a sequence of cropped subtitle images from a single episode, in chronological order. Each image shows white Chinese text on a black background.

For each image, perform the following:
1. OCR: Read the Chinese text exactly as shown, preserving all punctuation including ellipses (… and ……), periods, question marks, etc.
2. Segment: Split the text into individual words
3. Pinyin: Provide pinyin with tone marks for each word
4. Translate: Provide a concise English translation for each word
5. Sentence translation: Provide a natural English translation of the full line
6. Grammar notes: Briefly explain any notable grammar patterns, idioms, or contextual word usage that a Chinese learner would benefit from understanding

Important notes:
- Character names in this show include: 小黑 (Xiao Hei), 小白 (Xiao Bai), 罗小黑 (Luo Xiao Hei), 无限 (Wu Xian), 风息 (Feng Xi)
- Preserve proper nouns as single tokens
- For grammatical particles (了, 的, 吗, 呢, 吧, etc.), label them as such in the translation
- Use context from surrounding subtitles to disambiguate
- Keep grammar notes concise (1-2 sentences). Only include them when there is something genuinely useful to explain — skip for simple/obvious lines.

Return ONLY valid JSON in this exact format, with no other text:

[
  {
    "start": "<start_timestamp>",
    "end": "<end_timestamp>",
    "text": "<full OCR'd text>",
    "translation": "<natural English translation of the full line>",
    "grammar_notes": "<brief grammar/usage explanation, or empty string if not needed>",
    "words": [
      {"word": "<word>", "pinyin": "<pinyin>", "english": "<translation>"},
      ...
    ]
  },
  ...
]"""


def build_user_message(manifest: list[dict], image_dir: Path) -> list[dict]:
    """Build a user message with interleaved timestamps and images."""
    content = []
    for entry in manifest:
        img_path = image_dir / entry["image"]
        img_data = base64.standard_b64encode(img_path.read_bytes()).decode("utf-8")
        content.append({
            "type": "text",
            "text": f"Image: {entry['image']} — Start: {entry['start']} — End: {entry['end']}",
        })
        content.append({
            "type": "image",
            "source": {
                "type": "base64",
                "media_type": "image/png",
                "data": img_data,
            },
        })
    return content


def process_batch(client: anthropic.Anthropic, batch: list[dict], image_dir: Path, model: str) -> list[dict]:
    response = client.messages.create(
        model=model,
        max_tokens=16384,
        system=SYSTEM_PROMPT,
        messages=[{
            "role": "user",
            "content": build_user_message(batch, image_dir),
        }],
    )

    raw = response.content[0].text
    print(f"  Usage: {response.usage.input_tokens} input, {response.usage.output_tokens} output tokens")

    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1]
        raw = raw.rsplit("```", 1)[0]

    return json.loads(raw)


def process_episode(manifest_path: Path, model: str = "claude-sonnet-4-20250514", batch_size: int = 25) -> dict:
    image_dir = manifest_path.parent
    manifest_data = json.loads(manifest_path.read_text())
    subs = manifest_data["subtitles"]

    print(f"Processing {len(subs)} subtitle frames from {manifest_path}")

    client = anthropic.Anthropic()
    results = []

    for i in range(0, len(subs), batch_size):
        batch = subs[i:i + batch_size]
        batch_num = i // batch_size + 1
        total_batches = (len(subs) + batch_size - 1) // batch_size
        print(f"Batch {batch_num}/{total_batches} ({len(batch)} frames)...")
        results.extend(process_batch(client, batch, image_dir, model))

    return {
        "video": manifest_data["video"],
        "resolution": manifest_data["resolution"],
        "crop_y": manifest_data["crop_y"],
        "subtitles": results,
    }


def main():
    parser = argparse.ArgumentParser(description="Process subtitle crops with Claude Sonnet")
    parser.add_argument("manifest", help="Path to manifest.json from extract_subs.py")
    parser.add_argument("--output", "-o", default=None, help="Output JSON path (default: <manifest_dir>/subtitles.json)")
    parser.add_argument("--model", default="claude-sonnet-4-20250514", help="Model to use (default: claude-sonnet-4-20250514)")
    args = parser.parse_args()

    manifest_path = Path(args.manifest)
    if not manifest_path.exists():
        print(f"Error: {manifest_path} not found", file=sys.stderr)
        sys.exit(1)

    output_path = Path(args.output) if args.output else manifest_path.parent / "subtitles.json"

    result = process_episode(manifest_path, model=args.model)

    output_path.write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {len(result['subtitles'])} subtitles to {output_path}")


if __name__ == "__main__":
    main()
