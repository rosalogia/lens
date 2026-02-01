#!/usr/bin/env python3
"""Test PaddleOCR on the extracted subtitle crops."""

import json
from pathlib import Path
from paddleocr import PaddleOCR

ocr = PaddleOCR(use_textline_orientation=False, lang="ch")

test_dir = Path("test/out/episode_1")
manifest = json.loads((test_dir / "manifest.json").read_text())

# Test on the same 10 frames used for Haiku/Sonnet
test_timestamps = [
    "00:01:23.500", "00:01:25.000", "00:01:27.000", "00:01:30.000",
    "00:01:31.500", "00:01:34.500", "00:01:35.500", "00:01:39.000",
    "00:01:40.500", "00:01:41.500",
]
test_entries = [e for e in manifest if e["timestamp"] in test_timestamps]

for entry in test_entries:
    img_path = str(test_dir / entry["image"])
    result = ocr.predict(img_path)
    texts = []
    for res in result:
        if hasattr(res, 'rec_texts'):
            texts.extend(res.rec_texts)
        elif isinstance(res, dict) and 'rec_texts' in res:
            texts.extend(res['rec_texts'])
    combined = " ".join(texts) if texts else "(empty)"
    print(f"{entry['timestamp']}  →  {combined}")
