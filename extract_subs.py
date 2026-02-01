#!/usr/bin/env python3
"""Extract and deduplicate subtitle frames from a video file."""

import argparse
import json
import os
from pathlib import Path

import cv2
import imagehash
import numpy as np
from PIL import Image


def format_timestamp(seconds: float) -> str:
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    ms = int((seconds % 1) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d}.{ms:03d}"


def filename_from_timestamp(seconds: float) -> str:
    return format_timestamp(seconds).replace(":", "_").replace(".", "_") + ".png"


def detect_black_bar_y(cap, num_samples: int = 10, black_threshold: int = 30) -> int:
    """Detect where the black subtitle bar starts by sampling frames.

    Scans rows from the bottom up, looking for where the average brightness
    exceeds black_threshold consistently across multiple sample frames.
    Returns the y coordinate where the black bar begins.
    """
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    frame_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    # Sample frames evenly across the video
    sample_indices = np.linspace(total_frames * 0.1, total_frames * 0.9, num_samples, dtype=int)
    votes = np.zeros(frame_height, dtype=int)

    for idx in sample_indices:
        cap.set(cv2.CAP_PROP_POS_FRAMES, int(idx))
        ret, frame = cap.read()
        if not ret:
            continue
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        row_means = np.mean(gray, axis=1)
        # Mark rows that are "black" (low brightness)
        votes[row_means < black_threshold] += 1

    # Find the topmost row that is black in most samples — scanning from bottom
    required = num_samples * 0.6
    for y in range(frame_height - 1, -1, -1):
        if votes[y] < required:
            return y + 1  # the row below is where the black bar starts
    return frame_height  # no black bar found


def is_blank(crop: np.ndarray, std_threshold: float = 10.0) -> bool:
    """Check if a subtitle crop has no text (just black)."""
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
    return float(np.std(gray)) < std_threshold


def extract_unique_subs(
    video_path: str,
    output_dir: str,
    crop_y_override: int | None = None,
    sample_interval: float = 0.5,
    hash_threshold: int = 8,
    blank_threshold: float = 10.0,
):
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise RuntimeError(f"Cannot open video: {video_path}")

    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration = total_frames / fps
    frame_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    frame_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))

    if crop_y_override is not None:
        crop_y = crop_y_override
    else:
        crop_y = detect_black_bar_y(cap)

    print(f"Video: {video_path}")
    print(f"Resolution: {frame_width}x{frame_height}, FPS: {fps:.1f}, Duration: {duration:.1f}s")
    print(f"Subtitle region: y={crop_y} to {frame_height} ({frame_height - crop_y}px)")

    os.makedirs(output_dir, exist_ok=True)

    prev_hash = None
    manifest = []
    sample_count = 0

    def close_last_entry(end_time: float):
        """Set the end timestamp on the most recent manifest entry."""
        if manifest and "end" not in manifest[-1]:
            manifest[-1]["end"] = format_timestamp(end_time)

    t = 0.0
    while t < duration:
        frame_num = int(t * fps)
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_num)
        ret, frame = cap.read()
        if not ret:
            break

        crop = frame[crop_y:frame_height, 0:frame_width]
        sample_count += 1

        if is_blank(crop, blank_threshold):
            close_last_entry(t)
            prev_hash = None
            t += sample_interval
            continue

        pil_crop = Image.fromarray(cv2.cvtColor(crop, cv2.COLOR_BGR2RGB))
        h = imagehash.phash(pil_crop)

        if prev_hash is None or (h - prev_hash) > hash_threshold:
            close_last_entry(t)
            fname = filename_from_timestamp(t)
            pil_crop.save(os.path.join(output_dir, fname))
            manifest.append({
                "start": format_timestamp(t),
                "image": fname,
            })
            prev_hash = h

        t += sample_interval

    close_last_entry(duration)
    cap.release()

    output = {
        "video": video_path,
        "resolution": {"width": frame_width, "height": frame_height},
        "crop_y": crop_y,
        "subtitles": manifest,
    }

    manifest_path = os.path.join(output_dir, "manifest.json")
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"Sampled {sample_count} frames, found {len(manifest)} unique subtitles")
    print(f"Output: {manifest_path}")
    return output


def main():
    parser = argparse.ArgumentParser(description="Extract unique subtitle frames from a video")
    parser.add_argument("video", help="Path to video file (.mp4 or .flv)")
    parser.add_argument("--output-dir", "-o", default=None, help="Output directory (default: out/<video_stem>)")
    parser.add_argument("--crop-y", type=int, default=None, help="Y pixel where subtitle bar starts (auto-detected if omitted)")
    parser.add_argument("--interval", type=float, default=0.5, help="Sampling interval in seconds (default: 0.5)")
    parser.add_argument("--hash-threshold", type=int, default=8, help="pHash difference threshold for dedup (default: 8)")
    parser.add_argument("--blank-threshold", type=float, default=10.0, help="Std dev threshold for blank detection (default: 10.0)")
    args = parser.parse_args()

    if args.output_dir is None:
        stem = Path(args.video).stem
        args.output_dir = os.path.join("out", stem)

    extract_unique_subs(
        video_path=args.video,
        output_dir=args.output_dir,
        crop_y_override=args.crop_y,
        sample_interval=args.interval,
        hash_threshold=args.hash_threshold,
        blank_threshold=args.blank_threshold,
    )


if __name__ == "__main__":
    main()
