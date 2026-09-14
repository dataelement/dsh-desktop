---
name: video-compare-tool
description: "对比两个视频的压缩质量，计算画质指标（PSNR、SSIM），并生成包含逐帧视觉对比的交互式 HTML 报告。当用户需要评估压缩效果、比较视频画质，或提及“视频对比”、“压缩分析”、“压缩前后对比”等关键词时触发。"
---

# 视频画质对比工具

## 概述

对比两个视频并生成交互式 HTML 报告，用于分析压缩效果。脚本会提取视频元数据、计算画质指标（PSNR、SSIM），并生成逐帧视觉对比，支持滑块、并排和网格三种查看模式。

## 适用场景

以下场景可使用此技能：
- 对比原始视频和压缩后的视频
- 分析视频压缩的画质和效率
- 评估编码器性能或码率变化的影响
- 用户提到"视频对比"、"视频画质"、"压缩分析"或"压缩前后对比"

## 核心用法

### 基本命令

```bash
python3 scripts/compare.py original.mp4 compressed.mp4
```

生成 `comparison.html`，包含：
- 视频参数（编码、分辨率、码率、时长、文件大小）
- 画质指标（PSNR、SSIM、文件大小/码率缩减百分比）
- 逐帧对比（默认每隔 5 秒提取一帧）

### 命令选项

```bash
# 自定义输出文件
python3 scripts/compare.py original.mp4 compressed.mp4 -o report.html

# 自定义帧间隔（数值越大，提取帧数越少，处理越快）
python3 scripts/compare.py original.mp4 compressed.mp4 --interval 10

# 批量对比
for original in originals/*.mp4; do
    compressed="compressed/$(basename "$original")"
    output="reports/$(basename "$original" .mp4).html"
    python3 scripts/compare.py "$original" "$compressed" -o "$output"
done
```

## 环境要求

### 系统依赖

**FFmpeg 和 FFprobe**（视频分析和帧提取必需）：

```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt update && sudo apt install ffmpeg

# Windows
# 从 https://ffmpeg.org/download.html 下载
# 或使用：winget install ffmpeg
```

**Python 3.8+**（使用了类型注解、f-string、pathlib）

### 视频规格

- **支持格式：** `.mp4`（推荐）、`.mov`、`.avi`、`.mkv`、`.webm`
- **文件大小限制：** 每个视频最大 500MB（可配置）
- **处理时间：** 普通视频约 1-2 分钟，取决于时长和帧间隔

## 脚本行为

### 自动校验

脚本会自动校验：
- FFmpeg/FFprobe 是否已安装且可用
- 文件是否存在、扩展名是否合法、文件大小是否超限
- 路径安全性（防止目录遍历攻击）

校验失败时会显示清晰的错误提示和解决建议。

### 画质指标

脚本计算两项标准画质指标：

**PSNR（峰值信噪比）：** 像素级相似度衡量（20-50 dB 范围，越高越好）

**SSIM（结构相似性指数）：** 感知相似度衡量（0.0-1.0 范围，越高越好）

详细的解读标准和画质阈值请参考 `references/video_metrics.md`。

### 帧提取

脚本按指定间隔（默认 5 秒）提取帧，将帧缩放至统一高度（800px）以便对比，并以 base64 数据 URL 的形式嵌入到独立的 HTML 文件中。处理完成后自动清理临时文件。

### 输出报告

生成的 HTML 报告包含：
- **滑块模式**：拖动滑块查看原始 vs 压缩画面（默认模式）
- **并排模式**：同时显示两个画面便于直接对比
- **网格模式**：紧凑的双列布局
- **缩放控制**：支持 50%-200% 放大查看
- 独立文件格式（无需服务器，可离线查看）

## 重要实现细节

### 安全性

脚本实现了以下安全措施：
- 路径校验（绝对路径、防止目录遍历）
- 命令注入防护（不使用 `shell=True`，参数经过验证）
- 资源限制（文件大小、超时时间）
- 自定义异常类：`ValidationError`、`FFmpegError`、`VideoComparisonError`

### 常见错误场景

**"FFmpeg not found"**：通过系统包管理器安装 FFmpeg（参见"环境要求"部分）

**"File too large"**：先压缩视频再对比，或调整 `scripts/compare.py` 中的 `MAX_FILE_SIZE_MB`

**"Operation timed out"**：增大 `FFMPEG_TIMEOUT` 常量，或使用更大的 `--interval` 值（减少处理帧数）

**"Frame count mismatch"**：两个视频的时长/帧率不同；脚本会自动截断至较少的帧数并显示警告

## 配置

脚本顶部包含可调整的常量，控制文件大小限制、超时时间、帧尺寸和提取间隔。如需自定义行为，请编辑 `scripts/compare.py` 顶部的常量。详细配置选项及其影响请参考 `references/configuration.md`。

## 参考资料

以下文件提供详细信息：
- **`references/video_metrics.md`**：画质指标解读（PSNR/SSIM 量表、压缩目标、码率参考）
- **`references/ffmpeg_commands.md`**：FFmpeg 命令参考（元数据提取、帧提取、故障排查）
- **`references/configuration.md`**：脚本配置选项和可调常量
- **`assets/template.html`**：HTML 报告模板，可自定义查看模式和样式
