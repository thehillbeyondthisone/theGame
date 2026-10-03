"""Extract reproducible, unretouched comparison frames from the approved clip.

Requires FFmpeg/ffprobe and Pillow. Run from any directory; pass executable paths
with --ffmpeg and --ffprobe if they are not on PATH. Does not modify the video.
"""

import argparse
import hashlib
import json
import subprocess
from fractions import Fraction
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
REFERENCE = ROOT / "docs" / "reference" / "sttng-episode"
EXPECTED_SHA256 = "58fabb5eb15b0574d22992aea69815ebe04b4ffa102e2cf9a82913666e26f866"
KEYFRAMES = [90, 180, 270, 630, 900, 1800, 1890, 1980]
OVERVIEW = list(range(0, 2134, 90))
CAPTURE = list(range(1740, 1981, 15))


def run(command):
    result = subprocess.run(command, capture_output=True, check=True)
    return result.stdout


def timecode(seconds):
    return f"{int(seconds // 60):02d}:{seconds % 60:06.3f}"


def sheet(images, indices, timestamps, path, title, columns=4):
    width, height, label = 320, 240, 25
    gap, header = 8, 46
    rows = (len(indices) + columns - 1) // columns
    canvas = Image.new("RGB", (columns * (width + gap) + gap,
                               rows * (height + label + gap) + gap + header), "#111318")
    draw = ImageDraw.Draw(canvas)
    font = ImageFont.load_default(size=15)
    draw.text((gap, 13), title, fill="white", font=font)
    for position, index in enumerate(indices):
        x = gap + (position % columns) * (width + gap)
        y = header + gap + (position // columns) * (height + label + gap)
        canvas.paste(images[index].resize((width, height), Image.Resampling.LANCZOS), (x, y))
        draw.text((x, y + height + 4), f"{timecode(timestamps[index])} | frame {index}",
                  fill="#dddddd", font=font)
    canvas.save(path)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "source",
        nargs="?",
        type=Path,
        default=REFERENCE / "videoplayback.mp4",
        help="path to a lawfully obtained local reference clip",
    )
    parser.add_argument("--ffmpeg", default="ffmpeg")
    parser.add_argument("--ffprobe", default="ffprobe")
    args = parser.parse_args()
    source = args.source.expanduser().resolve()
    if not source.is_file():
        raise SystemExit(f"Reference clip not found: {source}")
    digest = hashlib.sha256(source.read_bytes()).hexdigest()
    if digest != EXPECTED_SHA256:
        raise SystemExit("Reference hash mismatch: refusing to replace baseline derivatives.")

    metadata = json.loads(run([args.ffprobe, "-v", "error", "-show_format", "-show_streams",
                               "-of", "json", str(source)]))
    video = next(stream for stream in metadata["streams"] if stream["codec_type"] == "video")
    pts = json.loads(run([args.ffprobe, "-v", "error", "-select_streams", "v:0",
                          "-show_frames", "-show_entries", "frame=best_effort_timestamp_time",
                          "-of", "json", str(source)]))["frames"]
    timestamps = [float(frame["best_effort_timestamp_time"]) for frame in pts]
    indices = sorted(set(OVERVIEW + KEYFRAMES + CAPTURE))
    selection = "+".join(f"eq(n,{index})" for index in indices)
    pixels = run([args.ffmpeg, "-hide_banner", "-loglevel", "error", "-i", str(source),
                  "-vf", f"select='{selection}'", "-fps_mode", "passthrough",
                  "-f", "rawvideo", "-pix_fmt", "rgb24", "pipe:1"])
    width, height = video["width"], video["height"]
    frame_bytes = width * height * 3
    if len(pixels) != frame_bytes * len(indices):
        raise SystemExit("Unexpected decoded frame count; baseline derivatives were not written.")
    images = {index: Image.frombytes("RGB", (width, height),
              pixels[position * frame_bytes:(position + 1) * frame_bytes])
              for position, index in enumerate(indices)}
    frames = REFERENCE / "frames"
    frames.mkdir(exist_ok=True)
    for index in KEYFRAMES:
        images[index].save(frames / f"frame-{index:06d}.png")
    sheet(images, OVERVIEW, timestamps, REFERENCE / "overview.png",
          "Episode baseline | full clip survey | timestamps relative to supplied file")
    sheet(images, CAPTURE, timestamps, REFERENCE / "capture-sequence.png",
          "Episode baseline | approach / capture / transition | 15 source frames per step")
    manifest = {
        "baseline_id": "sttng-user-clip-2026-09-28",
        "source_file": source.name,
        "provenance": "User-supplied clip identified by the user as footage from the actual STTNG episode.",
        "sha256": digest,
        "bytes": source.stat().st_size,
        "duration_seconds": float(metadata["format"]["duration"]),
        "video_duration_seconds": float(video["duration"]),
        "width": width,
        "height": height,
        "frame_rate": video["avg_frame_rate"],
        "frame_rate_decimal": float(Fraction(video["avg_frame_rate"])),
        "decoded_frame_count": len(timestamps),
        "color_metadata": {key: video.get(key) for key in
                           ("color_range", "color_space", "color_transfer", "color_primaries")},
        "derivation": "FFmpeg source-frame selection and RGB24 decoding; no grading, sharpening, denoising, or generated pixels. PNG anchors retain 480x360. Sheets resize to 320x240 and add labels outside the image.",
        "frame_indexing": "Zero-based decoded presentation order; timestamps from ffprobe best_effort_timestamp_time.",
        "keyframes": [{"frame": i, "time_seconds": timestamps[i], "timecode": timecode(timestamps[i]),
                       "image": f"frames/frame-{i:06d}.png"} for i in KEYFRAMES],
        "sheets": {"overview.png": [{"frame": i, "time_seconds": timestamps[i]} for i in OVERVIEW],
                   "capture-sequence.png": [{"frame": i, "time_seconds": timestamps[i]} for i in CAPTURE]},
        "ffmpeg_version": run([args.ffmpeg, "-version"]).decode().splitlines()[0],
    }
    (REFERENCE / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"Verified {digest}; extracted {len(KEYFRAMES)} native-size anchors and two timestamped sheets.")


if __name__ == "__main__":
    main()
