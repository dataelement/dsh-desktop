---
name: video-quality-diff
description: This skill should be used when comparing two videos to analyze compression results or quality differences. Generates interactive HTML reports with quality metrics (PSNR, SSIM) and frame-by-frame visual comparisons. Triggers when users mention "compare videos", "video quality", "compression analysis", "before/after compression", or request quality assessment of compressed videos.
---

# Video Comparer

## Overview

Compare two videos and generate an interactive HTML report analyzing compression results. The script extracts video metadata, calculates quality metrics (PSNR, SSIM), and creates frame-by-frame visual comparisons with three viewing modes: slider, side-by-side, and grid.

## When to Use This Skill

Use this skill when:
- Comparing original and compressed videos
- Analyzing video compression quality and efficiency
- Evaluating codec performance or bitrate reduction impact
- Users mention "compare videos", "video quality", "compression analysis", or "before/after compression"

## Core Usage

### Basic Command

```bash
python3 scripts/compare.py original.mp4 compressed.mp4
```

Generates `comparison.html` with:
- Video parameters (codec, resolution, bitrate, duration, file size)
- Quality metrics (PSNR, SSIM, size/bitrate reduction percentages)
- Frame-by-frame comparison (default: frames at 5s intervals)

### Command Options

```bash
# Custom output file
python3 scripts/compare.py original.mp4 compressed.mp4 -o report.html

# Custom frame interval (larger = fewer frames, faster processing)
python3 scripts/compare.py original.mp4 compressed.mp4 --interval 10

# Batch comparison
for original in originals/*.mp4; do
    compressed="compressed/$(basename "$original")"
    output="reports/$(basename "$original" .mp4).html"
    python3 scripts/compare.py "$original" "$compressed" -o "$output"
done
```

## Requirements

### System Dependencies

**FFmpeg and FFprobe** (required for video analysis and frame extraction):

```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt update && sudo apt install ffmpeg

# Windows
# Download from https://ffmpeg.org/download.html
# Or use: winget install ffmpeg
```

**Python 3.8+** (uses type hints, f-strings, pathlib)

### Video Specifications

- **Supported formats:** `.mp4` (recommended), `.mov`, `.avi`, `.mkv`, `.webm`
- **File size limit:** 500MB per video (configurable)
- **Processing time:** ~1-2 minutes for typical videos; varies by duration and frame interval

## Script Behavior

### Automatic Validation

The script automatically validates:
- FFmpeg/FFprobe installation and availability
- File existence, extensions, and size limits
- Path security (prevents directory traversal)

Clear error messages with resolution guidance appear when validation fails.

### Quality Metrics

The script calculates two standard quality metrics:

**PSNR (Peak Signal-to-Noise Ratio):** Pixel-level similarity measurement (20-50 dB scale, higher is better)

**SSIM (Structural Similarity Index):** Perceptual similarity measurement (0.0-1.0 scale, higher is better)

For detailed interpretation scales and quality thresholds, consult `references/video_metrics.md`.

### Frame Extraction

The script extracts frames at specified intervals (default: 5 seconds), scales them to consistent height (800px) for comparison, and embeds them as base64 data URLs in self-contained HTML. Temporary files are automatically cleaned after processing.

### Output Report

The generated HTML report includes:
- **Slider Mode**: Drag to reveal original vs compressed (default)
- **Side-by-Side Mode**: Simultaneous display for direct comparison
- **Grid Mode**: Compact 2-column layout
- **Zoom Controls**: 50%-200% magnification
- Self-contained format (no server required, works offline)

## Important Implementation Details

### Security

The script implements:
- Path validation (absolute paths, prevents directory traversal)
- Command injection prevention (no `shell=True`, validated arguments)
- Resource limits (file size, timeouts)
- Custom exceptions: `ValidationError`, `FFmpegError`, `VideoComparisonError`

### Common Error Scenarios

**"FFmpeg not found"**: Install FFmpeg via platform package manager (see Requirements section)

**"File too large"**: Compress videos before comparison, or adjust `MAX_FILE_SIZE_MB` in `scripts/compare.py`

**"Operation timed out"**: Increase `FFMPEG_TIMEOUT` constant or use larger `--interval` value (processes fewer frames)

**"Frame count mismatch"**: Videos have different durations/frame rates; script auto-truncates to minimum frame count and shows warning

## Configuration

The script includes adjustable constants for file size limits, timeouts, frame dimensions, and extraction intervals. To customize behavior, edit the constants at the top of `scripts/compare.py`. For detailed configuration options and their impacts, consult `references/configuration.md`.

## Reference Materials

Consult these files for detailed information:
- **`references/video_metrics.md`**: Quality metrics interpretation (PSNR/SSIM scales, compression targets, bitrate guidelines)
- **`references/ffmpeg_commands.md`**: FFmpeg command reference (metadata extraction, frame extraction, troubleshooting)
- **`references/configuration.md`**: Script configuration options and adjustable constants
- **`assets/template.html`**: HTML report template for customizing viewing modes and styling