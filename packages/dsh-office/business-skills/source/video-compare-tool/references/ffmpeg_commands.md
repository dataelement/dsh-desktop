# FFmpeg 命令参考

## 目录

- [视频元数据提取](#视频元数据提取) - 使用 ffprobe 获取视频属性
- [帧提取](#帧提取) - 按间隔提取帧
- [画质指标计算](#画质指标计算) - PSNR、SSIM、VMAF 计算
- [视频信息查询](#视频信息查询) - 时长、分辨率、帧率、码率、编码格式查询
- [图像处理](#图像处理) - 缩放和格式转换
- [故障排查](#故障排查) - 调试 FFmpeg 问题
- [性能优化](#性能优化) - 速度和资源管理

## 视频元数据提取

### 基本视频信息
```bash
ffprobe -v quiet -print_format json -show_format -show_streams input.mp4
```

### 特定流信息
```bash
ffprobe -v quiet -select_streams v:0 -print_format json -show_format -show_streams input.mp4
```

### 获取指定字段
```bash
ffprobe -v quiet -show_entries format=duration -show_entries stream=width,height,codec_name,r_frame_rate -of csv=p=0 input.mp4
```

## 帧提取

### 按时间间隔提取帧
```bash
ffmpeg -i input.mp4 -vf "select='not(mod(t\,5))',setpts=N/FRAME_RATE/TB" -vsync 0 output_%03d.jpg
```

### 每隔 N 帧提取一帧
```bash
ffmpeg -i input.mp4 -vf "select='not(mod(n\,150))',scale=-1:800" -vsync 0 -q:v 2 frame_%03d.jpg
```

### 按时间戳提取帧
```bash
ffmpeg -i input.mp4 -vf "fps=1/5,scale=-1:800" -q:v 2 frame_%05d.jpg
```

## 画质指标计算

### PSNR 计算
```bash
ffmpeg -i original.mp4 -i compressed.mp4 -lavfi "[0:v][1:v]psnr=stats_file=-" -f null -
```

### SSIM 计算
```bash
ffmpeg -i original.mp4 -i compressed.mp4 -lavfi "[0:v][1:v]ssim=stats_file=-" -f null -
```

### 同时计算 PSNR 和 SSIM
```bash
ffmpeg -i original.mp4 -i compressed.mp4 -lavfi '[0:v][1:v]psnr=stats_file=-;[0:v][1:v]ssim=stats_file=-' -f null -
```

### VMAF 计算
```bash
ffmpeg -i original.mp4 -i compressed.mp4 -lavfi "[0:v][1:v]libvmaf=log_path=vmaf.log" -f null -
```

## 视频信息查询

### 获取视频时长
```bash
ffprobe -v quiet -show_entries format=duration -of csv=p=0 input.mp4
```

### 获取视频分辨率
```bash
ffprobe -v quiet -show_entries stream=width,height -of csv=p=0 input.mp4
```

### 获取帧率
```bash
ffprobe -v quiet -show_entries stream=r_frame_rate -of csv=p=0 input.mp4
```

### 获取码率
```bash
ffprobe -v quiet -show_entries format=bit_rate -of csv=p=0 input.mp4
```

### 获取编码信息
```bash
ffprobe -v quiet -show_entries stream=codec_name,codec_type -of csv=p=0 input.mp4
```

## 图像处理

### 按固定高度缩放
```bash
ffmpeg -i input.jpg -vf "scale=-1:800" output.jpg
```

### 按固定宽度缩放
```bash
ffmpeg -i input.jpg -vf "scale=1200:-1" output.jpg
```

### 高质量 JPEG
```bash
ffmpeg -i input.jpg -q:v 2 output.jpg
```

### 渐进式 JPEG
```bash
ffmpeg -i input.jpg -q:v 2 -progressive output.jpg
```

## 故障排查

### 检查 FFmpeg 版本
```bash
ffmpeg -version
```

### 查看可用滤镜
```bash
ffmpeg -filters
```

### 测试视频解码
```bash
ffmpeg -i input.mp4 -f null -
```

### 提取第一帧
```bash
ffmpeg -i input.mp4 -vframes 1 -q:v 2 first_frame.jpg
```

## 性能优化

### 使用多线程
```bash
ffmpeg -threads 4 -i input.mp4 -c:v libx264 -preset fast output.mp4
```

### 设置超时
```bash
timeout 300 ffmpeg -i input.mp4 -c:v libx264 output.mp4
```

### 限制内存使用
```bash
ffmpeg -i input.mp4 -c:v libx264 -x264-params threads=2:ref=3 output.mp4
```
