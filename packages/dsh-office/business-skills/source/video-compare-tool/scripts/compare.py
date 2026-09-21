#!/usr/bin/env python3
"""
Video Comparison Tool

Compare two videos (original vs compressed) and generate interactive HTML report.
Analyzes video metadata, quality metrics (PSNR/SSIM), and creates frame-by-frame
comparison UI with slider, side-by-side, and grid viewing modes.

Security features:
- Path validation and sanitization
- Command injection prevention
- Resource limits (file size, timeout)
- Comprehensive error handling
"""

import argparse
import json
import logging
import os
import re
import subprocess
import sys
import tempfile
import time
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# Configuration constants
ALLOWED_EXTENSIONS = {'.mp4', '.mov', '.avi', '.mkv', '.webm'}
MAX_FILE_SIZE_MB = 500
FFMPEG_TIMEOUT = 300  # 5 minutes
FFPROBE_TIMEOUT = 30  # 30 seconds
BASE_FRAME_HEIGHT = 800
FRAME_INTERVAL = 5  # seconds


class VideoComparisonError(Exception):
    """Base exception for video comparison errors."""
    pass


class ValidationError(VideoComparisonError):
    """Raised when input validation fails."""
    pass


class FFmpegError(VideoComparisonError):
    """Raised when FFmpeg operations fail."""
    pass


def validate_video_file(path: str) -> Path:
    """
    Validate video file exists, is readable, and has valid extension.

    Args:
        path: File path to validate

    Returns:
        Absolute Path object

    Raises:
        ValidationError: If validation fails
    """
    # Convert to absolute path to prevent directory traversal
    try:
        file_path = Path(path).resolve()
    except (ValueError, OSError) as e:
        raise ValidationError(f"Invalid file path '{path}': {e}")

    # Check file exists
    if not file_path.exists():
        raise ValidationError(f"File not found: {file_path}")

    # Check it's a file, not directory
    if not file_path.is_file():
        raise ValidationError(f"Path is not a file: {file_path}")

    # Check extension
    if file_path.suffix.lower() not in ALLOWED_EXTENSIONS:
        allowed = ', '.join(ALLOWED_EXTENSIONS)
        raise ValidationError(
            f"Unsupported file extension '{file_path.suffix}'. "
            f"Allowed: {allowed}"
        )

    # Check file is readable
    if not os.access(file_path, os.R_OK):
        raise ValidationError(f"File is not readable: {file_path}")

    # Check file size
    size_mb = file_path.stat().st_size / (1024 * 1024)
    if size_mb > MAX_FILE_SIZE_MB:
        raise ValidationError(
            f"File too large: {size_mb:.1f}MB (max: {MAX_FILE_SIZE_MB}MB). "
            f"Large files may cause memory issues."
        )

    return file_path


def check_ffmpeg_installed() -> None:
    """
    Verify FFmpeg and FFprobe are installed and accessible.

    Raises:
        ValidationError: If FFmpeg tools are not found
    """
    for tool in ['ffmpeg', 'ffprobe']:
        try:
            subprocess.run(
                [tool, '-version'],
                capture_output=True,
                timeout=5,
                check=True
            )
        except FileNotFoundError:
            raise ValidationError(
                f"{tool} not found. Please install FFmpeg:\n"
                f"  macOS:   brew install ffmpeg\n"
                f"  Ubuntu:  sudo apt install ffmpeg\n"
                f"  Windows: Download from https://ffmpeg.org/download.html"
            )
        except subprocess.TimeoutExpired:
            raise ValidationError(f"{tool} command timed out")
        except subprocess.CalledProcessError as e:
            raise ValidationError(f"{tool} failed: {e}")


def run_ffmpeg_command(
    args: List[str],
    timeout: int = FFMPEG_TIMEOUT,
    description: str = "FFmpeg operation"
) -> str:
    """
    Run FFmpeg command with security measures.

    Args:
        args: Command arguments as list (prevents shell injection)
        timeout: Maximum execution time in seconds
        description: Human-readable description for error messages

    Returns:
        Command output (stdout)

    Raises:
        FFmpegError: If command fails
    """
    try:
        result = subprocess.run(
            args,
            capture_output=True,
            timeout=timeout,
            check=True,
            text=True
        )
        return result.stdout
    except subprocess.TimeoutExpired:
        raise FFmpegError(
            f"{description} timed out after {timeout} seconds. "
            f"Try with smaller video files or increase timeout."
        )
    except subprocess.CalledProcessError as e:
        error_msg = e.stderr.strip() if e.stderr else "Unknown error"
        raise FFmpegError(
            f"{description} failed:\n{error_msg}\n\n"
            f"Command: {' '.join(args)}"
        )
    except Exception as e:
        raise FFmpegError(f"{description} error: {e}")


def validate_video_similarity(
    metadata1: Dict,
    metadata2: Dict,
    duration_threshold: float = 5.0,
    allow_size_increase: bool = False
) -> None:
    """
    Validate that two videos are likely the same content.

    Args:
        metadata1: First video metadata (original)
        metadata2: Second video metadata (compressed)
        duration_threshold: Maximum allowed duration difference in seconds
        allow_size_increase: If False, warn when compressed is larger

    Raises:
        ValidationError: If videos appear to be different content
    """
    errors = []
    warnings = []

    # Check duration similarity
    duration_diff = abs(metadata1['duration'] - metadata2['duration'])
    if duration_diff > duration_threshold:
        errors.append(
            f"Duration mismatch: {metadata1['duration']:.1f}s vs {metadata2['duration']:.1f}s "
            f"(difference: {duration_diff:.1f}s > threshold: {duration_threshold}s)"
        )

    # Check resolution
    if (metadata1['width'], metadata1['height']) != (metadata2['width'], metadata2['height']):
        warnings.append(
            f"Resolution differs: {metadata1['width']}x{metadata1['height']} vs "
            f"{metadata2['width']}x{metadata2['height']}"
        )

    # Check frame rate (allow 10% difference for re-encoding)
    fps_diff_pct = abs(metadata1['fps'] - metadata2['fps']) / metadata1['fps'] * 100 if metadata1['fps'] > 0 else 0
    if fps_diff_pct > 10:
        warnings.append(
            f"Frame rate differs significantly: {metadata1['fps']:.1f} vs {metadata2['fps']:.1f} fps "
            f"({fps_diff_pct:.1f}% difference)"
        )

    # Check file size (compressed should typically be smaller)
    if not allow_size_increase and metadata2['size'] > metadata1['size']:
        size_increase_pct = (metadata2['size'] - metadata1['size']) / metadata1['size'] * 100
        warnings.append(
            f"'Compressed' file is LARGER: {metadata1['size']/(1024*1024):.1f}MB vs "
            f"{metadata2['size']/(1024*1024):.1f}MB (+{size_increase_pct:.1f}%)"
        )

    # Raise error if critical issues found
    if errors:
        raise ValidationError(
            "Videos appear to be different content:\n  " + "\n  ".join(errors)
        )

    # Print warnings
    if warnings:
        print("\n⚠️  Warning - videos may not be comparable:")
        for warning in warnings:
            print(f"  • {warning}")
        response = input("\nContinue anyway? [y/N]: ")
        if response.lower() not in ['y', 'yes']:
            raise ValidationError("Comparison cancelled by user")


def get_video_metadata(video_path: Path) -> Dict:
    """
    Extract video metadata using ffprobe.

    Args:
        video_path: Path to video file

    Returns:
        Dictionary containing video metadata

    Raises:
        FFmpegError: If metadata extraction fails
    """
    args = [
        'ffprobe',
        '-v', 'error',
        '-select_streams', 'v:0',
        '-show_entries', 'stream=codec_name,width,height,r_frame_rate,bit_rate,duration',
        '-show_entries', 'format=size,duration',
        '-of', 'json',
        str(video_path)
    ]

    output = run_ffmpeg_command(
        args,
        timeout=FFPROBE_TIMEOUT,
        description="Video metadata extraction"
    )

    try:
        data = json.loads(output)
    except json.JSONDecodeError as e:
        raise FFmpegError(f"Failed to parse ffprobe output: {e}")

    # Extract relevant information
    stream = data.get('streams', [{}])[0]
    format_info = data.get('format', {})

    # Parse frame rate (e.g., "30000/1001" -> 29.97)
    fps_str = stream.get('r_frame_rate', '0/1')
    try:
        num, denom = map(int, fps_str.split('/'))
        fps = num / denom if denom != 0 else 0
    except (ValueError, ZeroDivisionError):
        fps = 0

    # Get duration (prefer stream duration, fallback to format duration)
    duration = float(stream.get('duration') or format_info.get('duration') or 0)

    # Get bitrate (prefer stream bitrate, calculate from format if needed)
    bitrate = stream.get('bit_rate')
    if not bitrate and duration > 0:
        size = int(format_info.get('size', 0))
        bitrate = int((size * 8) / duration)

    return {
        'codec': stream.get('codec_name', 'unknown'),
        'width': int(stream.get('width', 0)),
        'height': int(stream.get('height', 0)),
        'fps': round(fps, 2),
        'bitrate': int(bitrate) if bitrate else 0,
        'duration': round(duration, 2),
        'size': int(format_info.get('size', 0))
    }


def calculate_quality_metrics(video1: Path, video2: Path) -> Dict:
    """
    Calculate PSNR and SSIM quality metrics between two videos.

    Args:
        video1: Path to first video (original)
        video2: Path to second video (compressed)

    Returns:
        Dictionary with PSNR and SSIM metrics

    Raises:
        FFmpegError: If metric calculation fails
    """
    # Create temporary file for metrics output
    with tempfile.NamedTemporaryFile(mode='w', suffix='.log', delete=False) as f:
        log_file = f.name

    try:
        # Calculate PSNR and SSIM in one pass for efficiency
        args = [
            'ffmpeg',
            '-i', str(video1),
            '-i', str(video2),
            '-lavfi', '[0:v][1:v]psnr=stats_file=-;[0:v][1:v]ssim=stats_file=-',
            '-f', 'null',
            '-'
        ]

        output = run_ffmpeg_command(
            args,
            timeout=FFMPEG_TIMEOUT,
            description="Quality metrics calculation"
        )

        # Parse PSNR from stderr (ffmpeg outputs to stderr)
        # Example: "PSNR mean:38.123456 min:35.123456 max:42.123456"
        psnr_match = re.search(r'PSNR.*?mean:([\d.]+)', output)
        psnr = float(psnr_match.group(1)) if psnr_match else 0.0

        # Parse SSIM from stderr
        # Example: "SSIM mean:0.956789 min:0.923456 max:0.987654"
        ssim_match = re.search(r'SSIM.*?mean:([\d.]+)', output)
        ssim = float(ssim_match.group(1)) if ssim_match else 0.0

        return {
            'psnr': round(psnr, 2),
            'ssim': round(ssim, 4)
        }
    finally:
        # Clean up temporary file
        try:
            os.unlink(log_file)
        except OSError:
            pass


def extract_frames(
    video_path: Path,
    output_dir: Path,
    interval: int = FRAME_INTERVAL
) -> List[Tuple[float, Path]]:
    """
    Extract frames at specified interval.

    Args:
        video_path: Path to video file
        output_dir: Directory to save frames
        interval: Interval in seconds between frames

    Returns:
        List of tuples (timestamp, frame_path)

    Raises:
        FFmpegError: If frame extraction fails
    """
    # Get video metadata to calculate frame count
    metadata = get_video_metadata(video_path)
    duration = metadata['duration']
    fps = metadata['fps']

    if duration <= 0 or fps <= 0:
        raise FFmpegError("Invalid video duration or frame rate")

    # Calculate frame interval
    frame_interval = int(fps * interval)

    # Extract frames using select filter
    # Format: frame_001.png (PNG for better quality, numbered starting from 001)
    output_pattern = str(output_dir / 'frame_%03d.png')

    args = [
        'ffmpeg',
        '-i', str(video_path),
        '-vf', f"select='not(mod(n\\,{frame_interval}))'",
        '-vsync', '0',
        output_pattern
    ]

    run_ffmpeg_command(
        args,
        timeout=FFMPEG_TIMEOUT,
        description="Frame extraction"
    )

    # Collect extracted frames with timestamps
    frames = []
    for i, frame_file in enumerate(sorted(output_dir.glob('frame_*.png'))):
        timestamp = i * interval
        frames.append((timestamp, frame_file))

    if not frames:
        raise FFmpegError("No frames were extracted from video")

    return frames


def format_timestamp(seconds: float) -> str:
    """
    Format timestamp as MM:SS.

    Args:
        seconds: Time in seconds

    Returns:
        Formatted timestamp string
    """
    minutes = int(seconds // 60)
    secs = int(seconds % 60)
    return f"{minutes:02d}:{secs:02d}"


def format_filesize(bytes: int) -> str:
    """
    Format file size as human-readable string.

    Args:
        bytes: Size in bytes

    Returns:
        Formatted size string
    """
    for unit in ['B', 'KB', 'MB', 'GB']:
        if bytes < 1024.0:
            return f"{bytes:.2f} {unit}"
        bytes /= 1024.0
    return f"{bytes:.2f} TB"


def format_bitrate(bps: int) -> str:
    """
    Format bitrate as human-readable string.

    Args:
        bps: Bitrate in bits per second

    Returns:
        Formatted bitrate string
    """
    kbps = bps / 1000
    if kbps < 1000:
        return f"{kbps:.0f} kbps"
    mbps = kbps / 1000
    return f"{mbps:.2f} Mbps"


def analyze_comparison_results(
    original_metadata: Dict,
    compressed_metadata: Dict,
    quality_metrics: Dict
) -> Dict:
    """
    Analyze video comparison results and generate insights.

    Args:
        original_metadata: Original video metadata
        compressed_metadata: Compressed video metadata
        quality_metrics: Quality metrics (PSNR, SSIM)

    Returns:
        Dictionary with analysis results including problems, strengths, and explanations
    """
    problems = []
    strengths = []
    explanations = []

    orig_codec = original_metadata['codec'].upper()
    comp_codec = compressed_metadata['codec'].upper()
    psnr = quality_metrics['psnr']
    ssim = quality_metrics['ssim']

    size_reduction = (original_metadata['size'] - compressed_metadata['size']) / original_metadata['size'] * 100
    bitrate_change = (compressed_metadata['bitrate'] - original_metadata['bitrate']) / original_metadata['bitrate'] * 100 if original_metadata['bitrate'] > 0 else 0

    # Analyze codec conversion
    if orig_codec != comp_codec:
        if orig_codec == 'HEVC' and comp_codec == 'H264':
            problems.append(f'<strong>编码转换损失</strong>: {orig_codec} → {comp_codec} 转码导致质量下降，H264 压缩效率低于 HEVC')
            explanations.append(
                f'<strong>为什么编码改变了？</strong><br>'
                f'平台将你的 {orig_codec} 视频重新编码为 {comp_codec}。虽然 {orig_codec} 压缩效率更高，'
                f'但平台为了兼容性使用 {comp_codec}，这在相同码率下会导致画质下降。'
            )
        else:
            problems.append(f'<strong>编码转换</strong>: {orig_codec} → {comp_codec} 重新编码可能影响质量')
    else:
        if comp_codec == 'HEVC':
            strengths.append(f'<strong>编码保持</strong>: 保持 {comp_codec} 编码，压缩效率较高')

    # Analyze PSNR
    if psnr > 0:  # Valid PSNR
        if psnr < 25:
            problems.append(f'<strong>PSNR 偏低</strong>: {psnr:.2f} dB 表示存在明显的压缩伪影和细节损失')
        elif psnr < 30:
            problems.append(f'<strong>PSNR 中等</strong>: {psnr:.2f} dB 存在可见的质量损失，但在可接受范围内')
        else:
            strengths.append(f'<strong>PSNR 优秀</strong>: {psnr:.2f} dB 表示画质损失很小')

        explanations.append(
            '<strong>PSNR 含义：</strong><br>'
            '• PSNR > 35 dB: 优秀，几乎无损<br>'
            '• 30-35 dB: 良好，轻微损失<br>'
            '• 25-30 dB: 中等，可见损失<br>'
            f'• < 25 dB: 较差，明显损失<br>'
            f'你的视频 PSNR={psnr:.2f} dB'
        )

    # Analyze SSIM
    if ssim > 0:  # Valid SSIM
        if ssim < 0.85:
            problems.append(f'<strong>结构相似度低</strong>: SSIM {ssim:.3f} 说明画面结构有明显变化')
        elif ssim < 0.95:
            strengths.append(f'<strong>结构相似度高</strong>: SSIM {ssim:.3f} 说明整体结构和内容保持良好')
        else:
            strengths.append(f'<strong>结构相似度优秀</strong>: SSIM {ssim:.3f} 几乎无结构损失')

        explanations.append(
            '<strong>SSIM 含义：</strong><br>'
            '• SSIM > 0.95: 优秀，几乎无损<br>'
            '• 0.90-0.95: 良好，轻微损失<br>'
            '• 0.85-0.90: 中等，可见损失<br>'
            f'• < 0.85: 较差，明显损失<br>'
            f'你的视频 SSIM={ssim:.3f}'
        )

    # Analyze size/bitrate changes
    if size_reduction > 0:
        strengths.append(f'<strong>文件大小优化</strong>: 减少了 {size_reduction:.1f}%，节省存储空间')
    else:
        problems.append(f'<strong>文件反而变大</strong>: 增加了 {-size_reduction:.1f}%，可能是重新编码导致')

    if abs(bitrate_change) < 5:
        strengths.append(f'<strong>码率基本不变</strong>: {bitrate_change:+.1f}%，带宽消耗相近')
    elif bitrate_change < -10:
        explanations.append(
            '<strong>建议：</strong><br>'
            f'平台降低了码率 {-bitrate_change:.1f}%。如果希望保持更好的画质，'
            '可以尝试上传前适当降低原视频码率（如调整至平台目标码率），这样重新编码损失会更小。'
        )

    # Analyze resolution
    if original_metadata['width'] == compressed_metadata['width'] and original_metadata['height'] == compressed_metadata['height']:
        strengths.append(
            f"<strong>分辨率不变</strong>: 保持 {original_metadata['width']}×{original_metadata['height']} 原始分辨率"
        )
    else:
        problems.append(
            f"<strong>分辨率改变</strong>: {original_metadata['width']}×{original_metadata['height']} → "
            f"{compressed_metadata['width']}×{compressed_metadata['height']}"
        )

    # Analyze frame rate
    fps_change = abs(original_metadata['fps'] - compressed_metadata['fps'])
    if fps_change < 1:
        strengths.append(f"<strong>帧率保持</strong>: {original_metadata['fps']:.0f} FPS 未改变")
    else:
        problems.append(
            f"<strong>帧率改变</strong>: {original_metadata['fps']:.0f} → {compressed_metadata['fps']:.0f} FPS"
        )

    return {
        'problems': problems if problems else ['<strong>未发现明显问题</strong>: 压缩处理较为理想'],
        'strengths': strengths if strengths else ['<strong>基本信息保留</strong>: 视频基本参数未发生重大变化'],
        'explanations': explanations if explanations else ['<strong>说明</strong>: 此次压缩基本符合预期']
    }


def copy_frames_to_output(
    frames: List[Tuple[float, Path]],
    output_html_path: Path,
    subfolder: str
) -> None:
    """
    Copy frames to a subdirectory next to the HTML output.

    Args:
        frames: List of (timestamp, frame_path) tuples
        output_html_path: Path to the output HTML file
        subfolder: Subdirectory name (e.g., 'original', 'wechat')

    Raises:
        IOError: If frames cannot be copied
    """
    import shutil

    # Create subdirectory next to HTML file
    output_dir = output_html_path.parent / subfolder
    output_dir.mkdir(parents=True, exist_ok=True)

    # Copy frames with proper naming
    for i, (timestamp, frame_path) in enumerate(frames, start=1):
        dest_name = f"frame_{i:03d}.png"
        dest_path = output_dir / dest_name
        try:
            shutil.copy2(frame_path, dest_path)
        except Exception as e:
            raise IOError(f"Failed to copy frame {frame_path} to {dest_path}: {e}")


def generate_html_report(
    original_path: Path,
    compressed_path: Path,
    original_metadata: Dict,
    compressed_metadata: Dict,
    quality_metrics: Dict,
    original_frames: List[Tuple[float, Path]],
    compressed_frames: List[Tuple[float, Path]],
    output_path: Path
) -> None:
    """
    Generate interactive HTML comparison report using Chinese template.

    Args:
        original_path: Path to original video
        compressed_path: Path to compressed video
        original_metadata: Original video metadata
        compressed_metadata: Compressed video metadata
        quality_metrics: Quality metrics (PSNR, SSIM)
        original_frames: List of (timestamp, frame_path) for original
        compressed_frames: List of (timestamp, frame_path) for compressed
        output_path: Path to save HTML report

    Raises:
        IOError: If report cannot be written
    """
    import re

    # Copy frames to output directories
    print("   Copying frames to output directories...")
    copy_frames_to_output(original_frames, output_path, 'original')
    copy_frames_to_output(compressed_frames, output_path, 'wechat')

    # Analyze comparison results to generate insights
    print("   Analyzing comparison results...")
    analysis = analyze_comparison_results(original_metadata, compressed_metadata, quality_metrics)

    # Read HTML template
    template_path = Path(__file__).parent.parent / 'assets' / 'template.html'
    try:
        with open(template_path, 'r', encoding='utf-8') as f:
            html = f.read()
    except FileNotFoundError:
        raise IOError(f"Template not found: {template_path}")

    # Format values
    orig_codec = original_metadata['codec'].upper()
    comp_codec = compressed_metadata['codec'].upper()
    resolution = f"{original_metadata['width']}×{original_metadata['height']}"
    fps_val = f"{int(original_metadata['fps'])} FPS"
    duration_sec = original_metadata['duration']

    orig_bitrate_mbps = original_metadata['bitrate'] / 1_000_000
    comp_bitrate_mbps = compressed_metadata['bitrate'] / 1_000_000
    orig_size_mb = original_metadata['size'] / (1024 * 1024)
    comp_size_mb = compressed_metadata['size'] / (1024 * 1024)
    bitrate_change_pct = (
        (compressed_metadata['bitrate'] - original_metadata['bitrate'])
        / original_metadata['bitrate'] * 100
    ) if original_metadata['bitrate'] > 0 else 0

    psnr_val = quality_metrics['psnr']
    ssim_val = quality_metrics['ssim']

    # Step 1: Replace ALL codec references (in labels, metrics, everywhere)
    # Replace in labels
    html = re.sub(r'🎬 原始视频 \([A-Z0-9]+\)', f'🎬 原始视频 ({orig_codec})', html)
    html = re.sub(r'📱 微信视频号 \([A-Z0-9]+\)', f'📱 微信视频号 ({comp_codec})', html)

    # Replace in metric card
    html = re.sub(
        r'<div class="metric-value">[A-Z0-9]+ → [A-Z0-9]+</div>',
        f'<div class="metric-value">{orig_codec} → {comp_codec}</div>',
        html,
        count=1
    )

    # Replace subtitle if codec changed
    if orig_codec != comp_codec:
        html = html.replace(
            '<div class="metric-subtitle">微信重新编码</div>',
            '<div class="metric-subtitle">平台重新编码</div>'
        )
    else:
        html = html.replace(
            '<div class="metric-subtitle">微信重新编码</div>',
            '<div class="metric-subtitle">编码格式保持</div>'
        )

    # Step 2: Replace resolution
    html = re.sub(
        r'<div class="metric-value">1080×1920</div>',
        f'<div class="metric-value">{resolution}</div>',
        html,
        count=1
    )

    # Step 3: Replace frame rate
    html = re.sub(
        r'<div class="metric-value">30 FPS</div>',
        f'<div class="metric-value">{fps_val}</div>',
        html,
        count=1
    )

    # Step 4: Replace duration
    html = re.sub(
        r'<div class="metric-value">[\d.]+\s*秒</div>',
        f'<div class="metric-value">{duration_sec:.2f} 秒</div>',
        html,
        count=1
    )

    # Step 5: Replace bitrate
    html = re.sub(
        r'<div class="metric-value multiline">[\d.]+ → [\d.]+<br>Mbps</div>\s*<div class="metric-subtitle">[+\-]?[\d.]+%</div>',
        f'<div class="metric-value multiline">{orig_bitrate_mbps:.2f} → {comp_bitrate_mbps:.2f}<br>Mbps</div>\n                    <div class="metric-subtitle">{bitrate_change_pct:+.1f}%</div>',
        html,
        count=1
    )

    # Step 6: Replace file size
    html = re.sub(
        r'<div class="metric-value multiline">[\d.]+ → [\d.]+<br>MB</div>\s*<div class="metric-subtitle">[+\-]?[\d.]+ MB</div>',
        f'<div class="metric-value multiline">{orig_size_mb:.1f} → {comp_size_mb:.1f}<br>MB</div>\n                    <div class="metric-subtitle">{(comp_size_mb - orig_size_mb):+.1f} MB</div>',
        html,
        count=1
    )

    # Step 7: Replace SSIM
    if ssim_val > 0:  # Valid SSIM
        ssim_display = f'{ssim_val * 100:.1f}%'
        ssim_subtitle = 'SSIM'
    else:  # Invalid SSIM
        ssim_display = 'N/A'
        ssim_subtitle = '无法计算'

    html = re.sub(
        r'<div class="metric-value">[\d.]+%</div>\s*<div class="metric-subtitle">SSIM</div>',
        f'<div class="metric-value">{ssim_display}</div>\n                    <div class="metric-subtitle">{ssim_subtitle}</div>',
        html,
        count=1
    )

    # Step 8: Replace PSNR
    if psnr_val > 0:  # Valid PSNR
        psnr_display = f'{psnr_val:.2f} dB'
        if psnr_val < 25:
            psnr_subtitle = '偏低'
        elif psnr_val < 30:
            psnr_subtitle = '中等'
        else:
            psnr_subtitle = '优秀'
    else:  # Invalid PSNR
        psnr_display = 'N/A'
        psnr_subtitle = '无法计算'

    html = re.sub(
        r'<div class="metric-value">[\d.]+ dB</div>\s*<div class="metric-subtitle">偏低</div>',
        f'<div class="metric-value">{psnr_display}</div>\n                    <div class="metric-subtitle">{psnr_subtitle}</div>',
        html,
        count=1
    )

    # Step 9: Generate and replace frame selector buttons
    frame_buttons_html = ""
    for i in range(1, len(original_frames) + 1):
        time_sec = (i - 1) * FRAME_INTERVAL
        frame_buttons_html += f'<button class="frame-btn{"" if i > 1 else " active"}" data-frame="{i}">{time_sec}秒</button>\n                '

    html = re.sub(
        r'<div class="frame-selector">.*?</div>',
        f'<div class="frame-selector">\n                {frame_buttons_html}</div>',
        html,
        flags=re.DOTALL
    )

    # Step 10: Replace JavaScript frame count and interval
    html = html.replace('for (let i = 1; i <= 22; i++)', f'for (let i = 1; i <= {len(original_frames)}; i++)')
    html = html.replace('time: (i - 1) * 5', f'time: (i - 1) * {FRAME_INTERVAL}')

    # Step 11: DYNAMICALLY GENERATE findings sections
    problems_html = '\n'.join([f'                    <li>{problem}</li>' for problem in analysis['problems']])
    strengths_html = '\n'.join([f'                    <li>{strength}</li>' for strength in analysis['strengths']])
    explanations_html = '<br><br>\n                    '.join(analysis['explanations'])

    # Replace problems section
    html = re.sub(
        r'<div class="findings">.*?<h3>⚠️ 发现的问题</h3>\s*<ul>.*?</ul>\s*</div>',
        f'''<div class="findings">
                <h3>⚠️ 发现的问题</h3>
                <ul>
{problems_html}
                </ul>
            </div>''',
        html,
        flags=re.DOTALL
    )

    # Replace strengths section
    html = re.sub(
        r'<div class="findings good-news">.*?<h3>✅ 保留较好的方面</h3>\s*<ul>.*?</ul>\s*</div>',
        f'''<div class="findings good-news">
                <h3>✅ 保留较好的方面</h3>
                <ul>
{strengths_html}
                </ul>
            </div>''',
        html,
        flags=re.DOTALL
    )

    # Replace technical explanation section
    html = re.sub(
        r'<div style="margin-top: 30px;.*?">.*?<h3.*?>💡 技术解释</h3>.*?</div>',
        f'''<div style="margin-top: 30px; padding: 20px; background: #e7f3ff; border-radius: 10px;">
                <h3 style="color: #0066cc; margin-bottom: 15px;">💡 技术解释</h3>
                <p style="color: #004080; line-height: 1.8; margin-bottom: 10px;">
                    {explanations_html}
                </p>
            </div>''',
        html,
        flags=re.DOTALL
    )

    # Write report
    try:
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(html)
    except Exception as e:
        raise IOError(f"Failed to write report to {output_path}: {e}")


def setup_logging(verbose: bool = False) -> None:
    """Setup logging configuration."""
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(sys.stderr)
        ]
    )


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='Compare two videos and generate interactive HTML report',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s original.mp4 compressed.mp4
  %(prog)s original.mp4 compressed.mp4 -o comparison.html
  %(prog)s ~/Videos/original.mov ~/Videos/compressed.mov --interval 10

Supported formats: .mp4, .mov, .avi, .mkv, .webm
        """
    )

    parser.add_argument(
        'original',
        help='Path to original video file'
    )
    parser.add_argument(
        'compressed',
        help='Path to compressed video file'
    )
    parser.add_argument(
        '-o', '--output',
        default='comparison.html',
        help='Output HTML report path (default: comparison.html)'
    )
    parser.add_argument(
        '--interval',
        type=int,
        default=FRAME_INTERVAL,
        help=f'Frame extraction interval in seconds (default: {FRAME_INTERVAL})'
    )
    parser.add_argument(
        '-v', '--verbose',
        action='store_true',
        help='Enable verbose logging'
    )

    args = parser.parse_args()

    # Setup logging
    setup_logging(args.verbose)

    try:
        logging.info("Starting video comparison tool")
        print("Video Comparison Tool")
        print("=" * 60)

        # Validate environment
        print("\n[1/7] Checking FFmpeg installation...")
        logging.info("Checking FFmpeg installation")
        check_ffmpeg_installed()
        logging.info("FFmpeg and FFprobe found")
        print("✓ FFmpeg and FFprobe found")

        # Validate inputs
        print("\n[2/7] Validating input files...")
        original_path = validate_video_file(args.original)
        compressed_path = validate_video_file(args.compressed)
        output_path = Path(args.output).resolve()
        print(f"✓ Original: {original_path.name} ({format_filesize(original_path.stat().st_size)})")
        print(f"✓ Compressed: {compressed_path.name} ({format_filesize(compressed_path.stat().st_size)})")

        # Extract metadata
        print("\n[3/7] Extracting video metadata...")
        original_metadata = get_video_metadata(original_path)
        compressed_metadata = get_video_metadata(compressed_path)
        print(f"✓ Original: {original_metadata['width']}x{original_metadata['height']} @ {original_metadata['fps']} fps, {original_metadata['duration']:.1f}s")
        print(f"✓ Compressed: {compressed_metadata['width']}x{compressed_metadata['height']} @ {compressed_metadata['fps']} fps, {compressed_metadata['duration']:.1f}s")

        # Validate videos are the same content
        print("\n[3.5/7] Validating videos are comparable...")
        validate_video_similarity(original_metadata, compressed_metadata)
        print("✓ Videos appear to be the same content")

        # Calculate quality metrics
        print("\n[4/7] Calculating quality metrics (PSNR, SSIM)...")
        print("   This may take 1-2 minutes...")
        start_time = time.time()
        quality_metrics = calculate_quality_metrics(original_path, compressed_path)
        elapsed = time.time() - start_time
        print(f"✓ PSNR: {quality_metrics['psnr']:.2f} dB, SSIM: {quality_metrics['ssim']:.4f} ({elapsed:.1f}s)")

        # Extract frames
        print(f"\n[5/7] Extracting frames (every {args.interval} seconds)...")
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            original_frames_dir = temp_path / 'original'
            compressed_frames_dir = temp_path / 'compressed'
            original_frames_dir.mkdir()
            compressed_frames_dir.mkdir()

            print("   Extracting from original video...")
            original_frames = extract_frames(original_path, original_frames_dir, args.interval)
            print(f"   ✓ Extracted {len(original_frames)} frames")

            print("   Extracting from compressed video...")
            compressed_frames = extract_frames(compressed_path, compressed_frames_dir, args.interval)
            print(f"   ✓ Extracted {len(compressed_frames)} frames")

            # Verify frame count matches
            if len(original_frames) != len(compressed_frames):
                print(f"   ⚠ Warning: Frame count mismatch ({len(original_frames)} vs {len(compressed_frames)})")
                min_frames = min(len(original_frames), len(compressed_frames))
                original_frames = original_frames[:min_frames]
                compressed_frames = compressed_frames[:min_frames]

            # Generate report
            print("\n[6/7] Generating HTML report...")
            generate_html_report(
                original_path,
                compressed_path,
                original_metadata,
                compressed_metadata,
                quality_metrics,
                original_frames,
                compressed_frames,
                output_path
            )

        print(f"✓ Report saved to: {output_path}")
        logging.info(f"Video comparison completed successfully. Report saved to: {output_path}")

        # Summary
        print("\n[7/7] Summary")
        print("=" * 60)
        size_reduction = (
            (original_metadata['size'] - compressed_metadata['size'])
            / original_metadata['size'] * 100
        )
        print(f"Size reduction:    {size_reduction:>6.1f}%")
        print(f"Quality (PSNR):    {quality_metrics['psnr']:>6.2f} dB")
        print(f"Quality (SSIM):    {quality_metrics['ssim']:>6.4f}")
        print(f"Frames compared:   {len(original_frames):>6}")
        print("\n✓ Comparison complete! Open the HTML report in your browser.")

        return 0

    except ValidationError as e:
        logging.error(f"Validation error: {e}")
        print(f"\n✗ Validation Error: {e}", file=sys.stderr)
        return 1
    except FFmpegError as e:
        logging.error(f"FFmpeg error: {e}")
        print(f"\n✗ FFmpeg Error: {e}", file=sys.stderr)
        return 2
    except IOError as e:
        logging.error(f"I/O error: {e}")
        print(f"\n✗ I/O Error: {e}", file=sys.stderr)
        return 3
    except KeyboardInterrupt:
        logging.info("Interrupted by user")
        print("\n\n✗ Interrupted by user", file=sys.stderr)
        return 130
    except Exception as e:
        logging.error(f"Unexpected error: {e}", exc_info=True)
        print(f"\n✗ Unexpected Error: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return 4


if __name__ == '__main__':
    sys.exit(main())
