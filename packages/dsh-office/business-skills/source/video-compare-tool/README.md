# 视频画质对比工具

一款专业的视频对比工具，用于分析压缩画质并生成交互式 HTML 报告。支持原始视频与压缩视频的详细指标（PSNR、SSIM）对比和逐帧视觉比较。

## 功能特性

### 视频分析
- **元数据提取**：编码格式、分辨率、帧率、码率、时长、文件大小
- **画质指标**：PSNR（峰值信噪比）和 SSIM（结构相似性指数）
- **压缩分析**：文件大小和码率的缩减百分比

### 交互式对比
- **三种查看模式**：
  - **滑块模式**：使用 img-comparison-slider 的交互式前后对比滑块
  - **并排模式**：同时显示两帧画面
  - **网格模式**：紧凑的双列布局
- **缩放控制**：50%-200% 缩放，基于真实图片尺寸
- **响应式设计**：适配桌面端、平板和手机

### 安全与可靠性
- **路径校验**：防止目录遍历攻击
- **命令注入防护**：subprocess 调用不使用 shell=True
- **资源限制**：文件大小和超时限制
- **完善的错误处理**：用户友好的错误提示

## 快速开始

### 前置条件

1. **Python 3.8+**（需要类型注解等现代特性）
2. **FFmpeg**（视频分析必需）

```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt install ffmpeg

# Windows
# 从 https://ffmpeg.org/download.html 下载
```

### 基本用法

```bash
# 进入技能目录
cd /path/to/video-quality-diff

# 对比两个视频
python3 scripts/compare.py original.mp4 compressed.mp4

# 打开生成的报告
open comparison.html  # macOS
# 或
xdg-open comparison.html  # Linux
# 或
start comparison.html  # Windows
```

### 命令行选项

```bash
python3 scripts/compare.py <原始视频> <压缩视频> [选项]

参数：
  original      原始视频文件路径
  compressed    压缩视频文件路径

选项：
  -o, --output PATH     输出 HTML 报告路径（默认：comparison.html）
  --interval SECONDS    帧提取间隔，单位秒（默认：5）
  -h, --help           显示帮助信息
```

### 使用示例

```bash
# 基本对比
python3 scripts/compare.py original.mp4 compressed.mp4

# 自定义输出文件
python3 scripts/compare.py original.mp4 compressed.mp4 -o report.html

# 每 10 秒提取一帧（帧数更少，处理更快）
python3 scripts/compare.py original.mp4 compressed.mp4 --interval 10

# 使用绝对路径对比
python3 scripts/compare.py ~/Videos/original.mov ~/Videos/compressed.mov

# 批量对比
for original in originals/*.mp4; do
    compressed="compressed/$(basename "$original")"
    python3 scripts/compare.py "$original" "$compressed" -o "reports/$(basename "$original" .mp4).html"
done
```

## 支持的格式

| 格式 | 扩展名 | 说明 |
|------|--------|------|
| MP4  | `.mp4` | 推荐，兼容性最好 |
| MOV  | `.mov` | Apple QuickTime 格式 |
| AVI  | `.avi` | 传统格式 |
| MKV  | `.mkv` | Matroska 容器 |
| WebM | `.webm` | Web 优化格式 |

## 输出报告

生成的 HTML 报告包含以下内容：

### 1. 视频参数对比
- **编码格式**：视频压缩格式（h264、hevc、vp9 等）
- **分辨率**：宽 × 高（像素）
- **帧率**：每秒帧数
- **码率**：数据速率（kbps/Mbps）
- **时长**：视频总长度
- **文件大小**：存储占用
- **文件名**：原始文件名称

### 2. 画质分析
- **文件缩减**：存储空间节省百分比
- **码率缩减**：带宽节省百分比
- **PSNR**：峰值信噪比（dB）
  - 30-35 dB：可接受的画质
  - 35-40 dB：良好画质
  - 40+ dB：优秀画质
- **SSIM**：结构相似性指数（0.0-1.0）
  - 0.90-0.95：良好画质
  - 0.95-0.98：很好的画质
  - 0.98+：优秀画质

### 3. 逐帧对比
- 交互式滑块，便于细节对比
- 并排查看，便于整体评估
- 网格布局，便于快速浏览
- 缩放控制（50%-200%）
- 每帧显示时间戳

## 配置

### `scripts/compare.py` 中的常量

```python
ALLOWED_EXTENSIONS = {'.mp4', '.mov', '.avi', '.mkv', '.webm'}
MAX_FILE_SIZE_MB = 500          # 最大文件大小限制
FFMPEG_TIMEOUT = 300            # FFmpeg 超时时间（5 分钟）
FFPROBE_TIMEOUT = 30            # FFprobe 超时时间（30 秒）
BASE_FRAME_HEIGHT = 800         # 对比帧高度
FRAME_INTERVAL = 5              # 默认帧提取间隔
```

### 自定义帧分辨率

调整对比帧的分辨率：

```python
# 在 scripts/compare.py 中
BASE_FRAME_HEIGHT = 1200  # 更高分辨率（文件更大）
# 或
BASE_FRAME_HEIGHT = 600   # 更低分辨率（文件更小）
```

## 性能参考

### 处理时间
- **元数据提取**：< 5 秒
- **画质指标计算**：1-2 分钟（取决于视频时长）
- **帧提取**：30-60 秒（取决于视频时长和间隔）
- **报告生成**：< 10 秒

### 文件大小
- **输入视频**：每个最大 500MB（可配置）
- **生成的报告**：2-5MB（取决于帧数）
- **临时文件**：处理过程中自动清理

### 资源占用
- **内存**：处理时约 200-500MB
- **磁盘空间**：约 100MB 临时文件
- **CPU**：中等（视频解码）

## 安全特性

### 路径校验
- 所有路径转换为绝对路径
- 验证文件存在且可读
- 按白名单检查文件扩展名
- 处理前验证文件大小

### 命令注入防护
- 所有 subprocess 调用使用参数列表
- 不使用 `shell=True`
- 用户输入不直接传递给 shell
- FFmpeg 参数经过验证和转义

### 资源限制
- 文件大小限制
- FFmpeg 操作超时限制
- 临时文件自动清理
- 内存使用监控

## 故障排查

### 常见问题

#### "FFmpeg not found"
```bash
# 使用包管理器安装 FFmpeg
brew install ffmpeg          # macOS
sudo apt install ffmpeg      # Ubuntu/Debian
sudo yum install ffmpeg      # CentOS/RHEL/Fedora
```

#### "File too large: X MB"
```bash
# 解决方案：
1. 先压缩视频再对比
2. 增大 compare.py 中的 MAX_FILE_SIZE_MB
3. 使用较短的视频片段
```

#### "Operation timed out"
```bash
# 对于很长的视频：
python3 scripts/compare.py original.mp4 compressed.mp4 --interval 10
# 或
# 增大 compare.py 中的 FFMPEG_TIMEOUT
```

#### "No frames extracted"
- 检查视频是否能在播放器中正常播放
- 确认视频时长大于帧间隔时间
- 确认 FFmpeg 能解码该编码格式

#### "Frame count mismatch"
- 两个视频的时长或帧率不同
- 脚本会自动截断至较少的帧数
- 输出中会显示警告信息

### 调试模式

修改脚本启用详细输出：

```python
# 在 compare.py 顶部添加
import logging
logging.basicConfig(level=logging.DEBUG)
```

## 架构

### 文件结构
```
video-quality-diff/
├── SKILL.md                      # 技能描述和调用说明
├── README.md                     # 本文件
├── assets/
│   └── template.html            # HTML 报告模板
├── references/
│   ├── video_metrics.md         # 画质指标参考
│   └── ffmpeg_commands.md       # FFmpeg 命令示例
└── scripts/
    └── compare.py               # 主对比脚本（696 行）
```

### 代码组织

- **compare.py**：包含所有功能的主脚本
  - 输入校验和安全检查
  - FFmpeg 集成和命令执行
  - 视频元数据提取
  - 画质指标计算（PSNR、SSIM）
  - 帧提取和处理
  - HTML 报告生成

- **template.html**：交互式报告模板
  - 响应式 CSS Grid 布局
  - Web Components 滑块功能
  - Base64 编码图片嵌入
  - 交互控件和缩放

### 依赖

- **Python 标准库**：os、subprocess、json、pathlib、tempfile、base64
- **外部工具**：FFmpeg、FFprobe（需单独安装）
- **Web 组件**：img-comparison-slider（从 CDN 加载）

## 开发

### 开发环境搭建

```bash
# 克隆仓库
git clone <repository-url>
cd video-quality-diff

# 创建虚拟环境（推荐）
python3 -m venv venv
source venv/bin/activate  # macOS/Linux
# 或
venv\Scripts\activate     # Windows

# 安装 FFmpeg（参见前置条件部分）
# 测试安装
python3 scripts/compare.py --help
```

### 代码风格

- **Python**：遵循 PEP 8
- **类型注解**：所有函数签名
- **文档字符串**：所有公开函数和类
- **错误处理**：完善的异常处理
- **安全性**：输入验证和清理

### 测试

```bash
# 用示例视频测试（需自行提供）
python3 scripts/compare.py test/original.mp4 test/compressed.mp4

# 测试错误处理
python3 scripts/compare.py nonexistent.mp4 also_nonexistent.mp4
python3 scripts/compare.py original.txt compressed.txt
```

## 许可证

本技能属于 claude-code-skills 合集的一部分。许可信息请参见主仓库。

## 支持

遇到问题时：
1. 查阅本 README 的故障排查部分
2. 查看 SKILL.md 了解详细用法
3. 确认 FFmpeg 已正确安装
4. 确认视频文件格式受支持

## 更新日志

### v1.0.0
- 首次发布
- 视频元数据提取
- PSNR 和 SSIM 画质指标
- 帧提取和对比
- 交互式 HTML 报告生成
- 安全特性和错误处理
- 响应式设计，支持移动端
