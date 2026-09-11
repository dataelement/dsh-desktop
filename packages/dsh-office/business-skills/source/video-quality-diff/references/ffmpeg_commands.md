# FFmpeg Commands Reference

## Contents

- [Video Metadata Extraction](#video-metadata-extraction) - Getting video properties with ffprobe
- [Frame Extraction](#frame-extraction) - Extracting frames at intervals
- [Quality Metrics Calculation](#quality-metrics-calculation) - PSNR, SSIM, VMAF calculations
- [Video Information](#video-information) - Duration, resolution, frame rate, bitrate, codec queries
- [Image Processing](#image-processing) - Scaling and format conversion
- [Troubleshooting](#troubleshooting) - Debugging FFmpeg issues
- [Performance Optimization](#performance-optimization) - Speed and resource management

## Video Metadata Extraction

### Basic Video Info
```bash
ffprobe -v quiet -print_format json -show_format -show_streams input.mp4
```

### Stream-specific Information
```bash
ffprobe -v quiet -select_streams v:0 -print_format json -show_format -show_streams input.mp4
```

### Get Specific Fields
```bash
ffprobe -v quiet -show_entries format=duration -show_entries stream=width,height,codec_name,r_frame_rate -of csv=p=0 input.mp4
```

## Frame Extraction

### Extract Frames at Intervals
```bash
ffmpeg -i input.mp4 -vf "select='not(mod(t\,5))',setpts=N/FRAME_RATE/TB" -vsync 0 output_%03d.jpg
```

### Extract Every Nth Frame
```bash
ffmpeg -i input.mp4 -vf "select='not(mod(n\,150))',scale=-1:800" -vsync 0 -q:v 2 frame_%03d.jpg
```

### Extract Frames with Timestamp
```bash
ffmpeg -i input.mp4 -vf "fps=1/5,scale=-1:800" -q:v 2 frame_%05d.jpg
```

## Quality Metrics Calculation

### PSNR Calculation
```bash
ffmpeg -i original.mp4 -i compressed.mp4 -lavfi "[0:v][1:v]psnr=stats_file=-" -f null -
```

### SSIM Calculation
```bash
ffmpeg -i original.mp4 -i compressed.mp4 -lavfi "[0:v][1:v]ssim=stats_file=-" -f null -
```

### Combined PSNR and SSIM
```bash
ffmpeg -i original.mp4 -i compressed.mp4 -lavfi '[0:v][1:v]psnr=stats_file=-;[0:v][1:v]ssim=stats_file=-' -f null -
```

### VMAF Calculation
```bash
ffmpeg -i original.mp4 -i compressed.mp4 -lavfi "[0:v][1:v]libvmaf=log_path=vmaf.log" -f null -
```

## Video Information

### Get Video Duration
```bash
ffprobe -v quiet -show_entries format=duration -of csv=p=0 input.mp4
```

### Get Video Resolution
```bash
ffprobe -v quiet -show_entries stream=width,height -of csv=p=0 input.mp4
```

### Get Frame Rate
```bash
ffprobe -v quiet -show_entries stream=r_frame_rate -of csv=p=0 input.mp4
```

### Get Bitrate
```bash
ffprobe -v quiet -show_entries format=bit_rate -of csv=p=0 input.mp4
```

### Get Codec Information
```bash
ffprobe -v quiet -show_entries stream=codec_name,codec_type -of csv=p=0 input.mp4
```

## Image Processing

### Scale to Fixed Height
```bash
ffmpeg -i input.jpg -vf "scale=-1:800" output.jpg
```

### Scale to Fixed Width
```bash
ffmpeg -i input.jpg -vf "scale=1200:-1" output.jpg
```

### High Quality JPEG
```bash
ffmpeg -i input.jpg -q:v 2 output.jpg
```

### Progressive JPEG
```bash
ffmpeg -i input.jpg -q:v 2 -progressive output.jpg
```

## Troubleshooting

### Check FFmpeg Version
```bash
ffmpeg -version
```

### Check Available Filters
```bash
ffmpeg -filters
```

### Test Video Decoding
```bash
ffmpeg -i input.mp4 -f null -
```

### Extract First Frame
```bash
ffmpeg -i input.mp4 -vframes 1 -q:v 2 first_frame.jpg
```

## Performance Optimization

### Use Multiple Threads
```bash
ffmpeg -threads 4 -i input.mp4 -c:v libx264 -preset fast output.mp4
```

### Set Timeout
```bash
timeout 300 ffmpeg -i input.mp4 -c:v libx264 output.mp4
```

### Limit Memory Usage
```bash
ffmpeg -i input.mp4 -c:v libx264 -x264-params threads=2:ref=3 output.mp4
```