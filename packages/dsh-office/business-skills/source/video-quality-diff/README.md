# Video Comparer

A professional video comparison tool that analyzes compression quality and generates interactive HTML reports. Compare original vs compressed videos with detailed metrics (PSNR, SSIM) and frame-by-frame visual comparisons.

## Features

### 🎯 Video Analysis
- **Metadata Extraction**: Codec, resolution, frame rate, bitrate, duration, file size
- **Quality Metrics**: PSNR (Peak Signal-to-Noise Ratio) and SSIM (Structural Similarity Index)
- **Compression Analysis**: Size and bitrate reduction percentages

### 🖼️ Interactive Comparison
- **Three Viewing Modes**:
  - **Slider Mode**: Interactive before/after slider using img-comparison-slider
  - **Side-by-Side Mode**: Simultaneous display of both frames
  - **Grid Mode**: Compact 2-column layout
- **Zoom Controls**: 50%-200% zoom with real image dimension scaling
- **Responsive Design**: Works on desktop, tablet, and mobile

### 🔒 Security & Reliability
- **Path Validation**: Prevents directory traversal attacks
- **Command Injection Prevention**: No shell=True in subprocess calls
- **Resource Limits**: File size and timeout restrictions
- **Comprehensive Error Handling**: User-friendly error messages

## Quick Start

### Prerequisites

1. **Python 3.8+** (for type hints and modern features)
2. **FFmpeg** (required for video analysis)

```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt install ffmpeg

# Windows
# Download from https://ffmpeg.org/download.html
```

### Basic Usage

```bash
# Navigate to the skill directory
cd /path/to/video-comparer

# Compare two videos
python3 scripts/compare.py original.mp4 compressed.mp4

# Open the generated report
open comparison.html  # macOS
# or
xdg-open comparison.html  # Linux
# or
start comparison.html  # Windows
```

### Command Line Options

```bash
python3 scripts/compare.py <original> <compressed> [options]

Arguments:
  original      Path to original video file
  compressed    Path to compressed video file

Options:
  -o, --output PATH     Output HTML report path (default: comparison.html)
  --interval SECONDS    Frame extraction interval in seconds (default: 5)
  -h, --help           Show help message
```

### Examples

```bash
# Basic comparison
python3 scripts/compare.py original.mp4 compressed.mp4

# Custom output file
python3 scripts/compare.py original.mp4 compressed.mp4 -o report.html

# Extract frames every 10 seconds (fewer frames, faster processing)
python3 scripts/compare.py original.mp4 compressed.mp4 --interval 10

# Compare with absolute paths
python3 scripts/compare.py ~/Videos/original.mov ~/Videos/compressed.mov

# Batch comparison
for original in originals/*.mp4; do
    compressed="compressed/$(basename "$original")"
    python3 scripts/compare.py "$original" "$compressed" -o "reports/$(basename "$original" .mp4).html"
done
```

## Supported Formats

| Format | Extension | Notes |
|--------|-----------|-------|
| MP4    | `.mp4`    | Recommended, widely supported |
| MOV    | `.mov`    | Apple QuickTime format |
| AVI    | `.avi`    | Legacy format |
| MKV    | `.mkv`    | Matroska container |
| WebM   | `.webm`   | Web-optimized format |

## Output Report

The generated HTML report includes:

### 1. Video Parameters Comparison
- **Codec**: Video compression format (h264, hevc, vp9, etc.)
- **Resolution**: Width × Height in pixels
- **Frame Rate**: Frames per second
- **Bitrate**: Data rate (kbps/Mbps)
- **Duration**: Total video length
- **File Size**: Storage requirement
- **Filenames**: Original file names

### 2. Quality Analysis
- **Size Reduction**: Percentage of storage saved
- **Bitrate Reduction**: Percentage of bandwidth saved
- **PSNR**: Peak Signal-to-Noise Ratio (dB)
  - 30-35 dB: Acceptable quality
  - 35-40 dB: Good quality
  - 40+ dB: Excellent quality
- **SSIM**: Structural Similarity Index (0.0-1.0)
  - 0.90-0.95: Good quality
  - 0.95-0.98: Very good quality
  - 0.98+: Excellent quality

### 3. Frame-by-Frame Comparison
- Interactive slider for detailed comparison
- Side-by-side viewing for overall assessment
- Grid layout for quick scanning
- Zoom controls (50%-200%)
- Timestamp labels for each frame

## Configuration

### Constants in `scripts/compare.py`

```python
ALLOWED_EXTENSIONS = {'.mp4', '.mov', '.avi', '.mkv', '.webm'}
MAX_FILE_SIZE_MB = 500          # Maximum file size limit
FFMPEG_TIMEOUT = 300            # FFmpeg timeout (5 minutes)
FFPROBE_TIMEOUT = 30            # FFprobe timeout (30 seconds)
BASE_FRAME_HEIGHT = 800         # Frame height for comparison
FRAME_INTERVAL = 5              # Default frame extraction interval
```

### Customizing Frame Resolution

To change the frame resolution for comparison:

```python
# In scripts/compare.py
BASE_FRAME_HEIGHT = 1200  # Higher resolution (larger file size)
# or
BASE_FRAME_HEIGHT = 600   # Lower resolution (smaller file size)
```

## Performance

### Processing Time
- **Metadata Extraction**: < 5 seconds
- **Quality Metrics**: 1-2 minutes (depends on video duration)
- **Frame Extraction**: 30-60 seconds (depends on video length and interval)
- **Report Generation**: < 10 seconds

### File Sizes
- **Input Videos**: Up to 500MB each (configurable)
- **Generated Report**: 2-5MB (depends on frame count)
- **Temporary Files**: Auto-cleaned during processing

### Resource Usage
- **Memory**: ~200-500MB during processing
- **Disk Space**: ~100MB temporary files
- **CPU**: Moderate (video decoding)

## Security Features

### Path Validation
- ✅ Converts all paths to absolute paths
- ✅ Verifies files exist and are readable
- ✅ Checks file extensions against whitelist
- ✅ Validates file size before processing

### Command Injection Prevention
- ✅ All subprocess calls use argument lists
- ✅ No `shell=True` in subprocess calls
- ✅ User input never passed to shell
- ✅ FFmpeg arguments validated and escaped

### Resource Limits
- ✅ File size limit enforcement
- ✅ Timeout limits for FFmpeg operations
- ✅ Temporary files auto-cleanup
- ✅ Memory usage monitoring

## Troubleshooting

### Common Issues

#### "FFmpeg not found"
```bash
# Install FFmpeg using your package manager
brew install ffmpeg          # macOS
sudo apt install ffmpeg      # Ubuntu/Debian
sudo yum install ffmpeg      # CentOS/RHEL/Fedora
```

#### "File too large: X MB"
```bash
# Options:
1. Compress videos before comparison
2. Increase MAX_FILE_SIZE_MB in compare.py
3. Use shorter video clips
```

#### "Operation timed out"
```bash
# For very long videos:
python3 scripts/compare.py original.mp4 compressed.mp4 --interval 10
# or
# Increase FFMPEG_TIMEOUT in compare.py
```

#### "No frames extracted"
- Check if videos are playable in media player
- Verify videos have sufficient duration (> interval seconds)
- Ensure FFmpeg can decode the codec

#### "Frame count mismatch"
- Videos have different durations or frame rates
- Script automatically truncates to minimum frame count
- Warning is displayed in output

### Debug Mode

Enable verbose output by modifying the script:

```python
# Add at the top of compare.py
import logging
logging.basicConfig(level=logging.DEBUG)
```

## Architecture

### File Structure
```
video-comparer/
├── SKILL.md                      # Skill description and invocation
├── README.md                     # This file
├── assets/
│   └── template.html            # HTML report template
├── references/
│   ├── video_metrics.md         # Quality metrics reference
│   └── ffmpeg_commands.md       # FFmpeg command examples
└── scripts/
    └── compare.py               # Main comparison script (696 lines)
```

### Code Organization

- **compare.py**: Main script with all functionality
  - Input validation and security checks
  - FFmpeg integration and command execution
  - Video metadata extraction
  - Quality metrics calculation (PSNR, SSIM)
  - Frame extraction and processing
  - HTML report generation

- **template.html**: Interactive report template
  - Responsive CSS Grid layout
  - Web Components for slider functionality
  - Base64-encoded image embedding
  - Interactive controls and zoom

### Dependencies

- **Python Standard Library**: os, subprocess, json, pathlib, tempfile, base64
- **External Tools**: FFmpeg, FFprobe (must be installed separately)
- **Web Components**: img-comparison-slider (loaded from CDN)

## Contributing

### Development Setup

```bash
# Clone the repository
git clone <repository-url>
cd video-comparer

# Create virtual environment (optional but recommended)
python3 -m venv venv
source venv/bin/activate  # macOS/Linux
# or
venv\Scripts\activate     # Windows

# Install FFmpeg (see Prerequisites section)
# Test the installation
python3 scripts/compare.py --help
```

### Code Style

- **Python**: PEP 8 compliance
- **Type Hints**: All function signatures
- **Docstrings**: All public functions and classes
- **Error Handling**: Comprehensive exception handling
- **Security**: Input validation and sanitization

### Testing

```bash
# Test with sample videos (you'll need to provide these)
python3 scripts/compare.py test/original.mp4 test/compressed.mp4

# Test error handling
python3 scripts/compare.py nonexistent.mp4 also_nonexistent.mp4
python3 scripts/compare.py original.txt compressed.txt
```

## License

This skill is part of the claude-code-skills collection. See the main repository for license information.

## Support

For issues and questions:
1. Check this README for troubleshooting
2. Review the SKILL.md file for detailed usage instructions
3. Ensure FFmpeg is properly installed
4. Verify video files are supported formats

## Changelog

### v1.0.0
- Initial release
- Video metadata extraction
- PSNR and SSIM quality metrics
- Frame extraction and comparison
- Interactive HTML report generation
- Security features and error handling
- Responsive design and mobile support