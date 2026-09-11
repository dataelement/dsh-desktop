# Script Configuration Reference

## Contents

- [Adjustable Constants](#adjustable-constants) - Modifying script behavior
- [File Processing Limits](#file-processing-limits) - Size and timeout constraints
- [Frame Extraction Settings](#frame-extraction-settings) - Visual comparison parameters
- [Configuration Impact](#configuration-impact) - Performance and quality tradeoffs

## Adjustable Constants

All configuration constants are defined at the top of `scripts/compare.py`:

```python
ALLOWED_EXTENSIONS = {'.mp4', '.mov', '.avi', '.mkv', '.webm'}
MAX_FILE_SIZE_MB = 500          # Maximum file size per video
FFMPEG_TIMEOUT = 300            # FFmpeg timeout (seconds) - 5 minutes
FFPROBE_TIMEOUT = 30            # FFprobe timeout (seconds) - 30 seconds
BASE_FRAME_HEIGHT = 800         # Frame height for comparison (pixels)
FRAME_INTERVAL = 5              # Default extraction interval (seconds)
```

## File Processing Limits

### MAX_FILE_SIZE_MB

**Default:** 500 MB

**Purpose:** Prevents memory exhaustion when processing very large videos.

**When to increase:**
- Working with high-resolution or long-duration source videos
- System has ample RAM (16GB+)
- Processing 4K or 8K content

**When to decrease:**
- Limited system memory
- Processing on lower-spec machines
- Batch processing many videos simultaneously

**Impact:** No effect on output quality, only determines which files can be processed.

### FFMPEG_TIMEOUT

**Default:** 300 seconds (5 minutes)

**Purpose:** Prevents FFmpeg operations from hanging indefinitely.

**When to increase:**
- Processing very long videos (>1 hour)
- Extracting many frames (small `--interval` value)
- Slow storage (network drives, external HDDs)
- High-resolution videos (4K, 8K)

**Recommended values:**
- Short videos (<10 min): 120 seconds
- Medium videos (10-60 min): 300 seconds (default)
- Long videos (>60 min): 600-900 seconds

**Impact:** Operation fails if exceeded; does not affect output quality.

### FFPROBE_TIMEOUT

**Default:** 30 seconds

**Purpose:** Prevents metadata extraction from hanging.

**When to increase:**
- Accessing videos over slow network connections
- Processing files with complex codec structures
- Corrupt or malformed video files

**Typical behavior:** Metadata extraction usually completes in <5 seconds; longer times suggest file issues.

**Impact:** Operation fails if exceeded; does not affect output quality.

## Frame Extraction Settings

### BASE_FRAME_HEIGHT

**Default:** 800 pixels

**Purpose:** Standardizes frame dimensions for side-by-side comparison.

**When to increase:**
- Comparing high-resolution videos (4K, 8K)
- Analyzing fine details or subtle compression artifacts
- Generating reports for large displays

**When to decrease:**
- Faster processing and smaller HTML output files
- Viewing reports on mobile devices or small screens
- Limited bandwidth for sharing reports

**Recommended values:**
- Mobile/low-bandwidth: 480-600 pixels
- Desktop viewing: 800 pixels (default)
- High-detail analysis: 1080-1440 pixels
- 4K/8K analysis: 2160+ pixels

**Impact:** Higher values increase HTML file size and processing time but preserve more detail.

### FRAME_INTERVAL

**Default:** 5 seconds

**Purpose:** Controls frame extraction frequency.

**When to decrease (extract more frames):**
- Analyzing fast-motion content
- Detailed temporal analysis needed
- Short videos where more samples help

**When to increase (extract fewer frames):**
- Long videos to reduce processing time
- Reducing HTML output file size
- Overview analysis (general quality check)

**Recommended values:**
- Fast-motion/detailed: 1-3 seconds
- Standard analysis: 5 seconds (default)
- Long-form content: 10-15 seconds
- Quick overview: 30-60 seconds

**Impact:**
- Smaller intervals: More frames, larger HTML, longer processing, more comprehensive analysis
- Larger intervals: Fewer frames, smaller HTML, faster processing, may miss transient artifacts

## Configuration Impact

### Processing Time

Processing time is primarily affected by:
1. Video duration
2. `FRAME_INTERVAL` (smaller = more frames = longer processing)
3. `BASE_FRAME_HEIGHT` (higher = more pixels = longer processing)
4. System CPU/storage speed

**Typical processing times:**
- 5-minute video, 5s interval, 800px height: ~45-90 seconds
- 30-minute video, 5s interval, 800px height: ~3-5 minutes
- 60-minute video, 10s interval, 800px height: ~4-7 minutes

### HTML Output Size

HTML file size is primarily affected by:
1. Number of extracted frames
2. `BASE_FRAME_HEIGHT` (higher = larger base64-encoded images)
3. Video complexity (detailed frames compress less efficiently)

**Typical HTML sizes:**
- 5-minute video, 5s interval, 800px: 5-10 MB
- 30-minute video, 5s interval, 800px: 20-40 MB
- 60-minute video, 10s interval, 800px: 30-50 MB

### Quality vs Performance Tradeoffs

**High Quality Configuration (detailed analysis):**
```python
MAX_FILE_SIZE_MB = 2000
FFMPEG_TIMEOUT = 900
BASE_FRAME_HEIGHT = 1440
FRAME_INTERVAL = 2
```
Use case: Detailed quality analysis, archival comparison, professional codec evaluation

**Balanced Configuration (default):**
```python
MAX_FILE_SIZE_MB = 500
FFMPEG_TIMEOUT = 300
BASE_FRAME_HEIGHT = 800
FRAME_INTERVAL = 5
```
Use case: Standard compression analysis, typical desktop viewing

**Fast Processing Configuration (quick overview):**
```python
MAX_FILE_SIZE_MB = 500
FFMPEG_TIMEOUT = 180
BASE_FRAME_HEIGHT = 600
FRAME_INTERVAL = 10
```
Use case: Batch processing, quick quality checks, mobile viewing

## Allowed File Extensions

**Default:** `{'.mp4', '.mov', '.avi', '.mkv', '.webm'}`

**Purpose:** Restricts input to known video formats.

**When to modify:**
- Adding support for additional container formats (e.g., `.flv`, `.m4v`, `.wmv`)
- Restricting to specific formats for workflow standardization

**Note:** Adding extensions does not guarantee compatibility; FFmpeg must support the codec/container.

## Security Considerations

**Do NOT modify:**
- Path validation logic
- Command execution methods (must avoid `shell=True`)
- Exception handling patterns

**Safe to modify:**
- Numeric limits (file size, timeouts, dimensions)
- Allowed file extensions (add formats supported by FFmpeg)
- Output formatting preferences

**Unsafe modifications:**
- Removing path sanitization
- Bypassing file validation
- Enabling shell command interpolation
- Disabling resource limits
