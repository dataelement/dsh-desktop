# Video Quality Metrics Reference

## Contents

- [PSNR (Peak Signal-to-Noise Ratio)](#psnr-peak-signal-to-noise-ratio) - Pixel-level similarity measurement
- [SSIM (Structural Similarity Index)](#ssim-structural-similarity-index) - Perceptual quality measurement
- [VMAF (Video Multimethod Assessment Fusion)](#vmaf-video-multimethod-assessment-fusion) - Machine learning-based quality prediction
- [File Size and Bitrate Considerations](#file-size-and-bitrate-considerations) - Compression targets and guidelines

## PSNR (Peak Signal-to-Noise Ratio)

### Definition
PSNR measures the ratio between the maximum possible power of a signal and the power of corrupting noise. It's commonly used to measure the quality of reconstruction of lossy compression codecs.

### Scale
- **Range**: Typically 20-50 dB
- **Higher is better**: More signal, less noise

### Quality Interpretation
| PSNR (dB) | Quality Level | Use Case |
|-----------|---------------|----------|
| < 20 | Poor | Unacceptable for most applications |
| 20-25 | Low | Acceptable for very low-bandwidth scenarios |
| 25-30 | Fair | Basic video streaming |
| 30-35 | Good | Standard streaming quality |
| 35-40 | Very Good | High-quality streaming |
| 40+ | Excellent | Near-lossless quality, archival |

### Calculation Formula
```
PSNR = 10 * log10(MAX_I^2 / MSE)
```
Where:
- MAX_I = maximum pixel value (255 for 8-bit images)
- MSE = mean squared error

## SSIM (Structural Similarity Index)

### Definition
SSIM is a perceptual metric that quantifies image quality degradation based on structural information changes rather than pixel-level differences.

### Scale
- **Range**: 0.0 to 1.0
- **Higher is better**: More structural similarity

### Quality Interpretation
| SSIM | Quality Level | Use Case |
|------|---------------|----------|
| < 0.70 | Poor | Visible artifacts, structural damage |
| 0.70-0.80 | Fair | Noticeable quality loss |
| 0.80-0.90 | Good | Acceptable for most streaming |
| 0.90-0.95 | Very Good | High-quality streaming |
| 0.95-0.98 | Excellent | Near-identical perception |
| 0.98+ | Perfect | Indistinguishable from original |

### Components
SSIM combines three comparisons:
1. **Luminance**: Local brightness comparisons
2. **Contrast**: Local contrast comparisons
3. **Structure**: Local structure correlations

## VMAF (Video Multimethod Assessment Fusion)

### Definition
VMAF is a machine learning-based metric that predicts subjective video quality by combining multiple quality metrics.

### Scale
- **Range**: 0-100
- **Higher is better**: Better perceived quality

### Quality Interpretation
| VMAF | Quality Level | Use Case |
|-------|---------------|----------|
| < 20 | Poor | Unacceptable |
| 20-40 | Low | Basic streaming |
| 40-60 | Fair | Standard streaming |
| 60-80 | Good | High-quality streaming |
| 80-90 | Very Good | Premium streaming |
| 90+ | Excellent | Reference quality |

## File Size and Bitrate Considerations

### Compression Targets by Use Case
| Use Case | Size Reduction | PSNR Target | SSIM Target |
|----------|----------------|-------------|-------------|
| Social Media | 40-60% | 35-40 dB | 0.95-0.98 |
| Streaming | 50-70% | 30-35 dB | 0.90-0.95 |
| Archival | 20-40% | 40+ dB | 0.98+ |
| Mobile | 60-80% | 25-30 dB | 0.85-0.90 |

### Bitrate Guidelines
| Resolution | Target Bitrate (1080p equivalent) |
|------------|-----------------------------------|
| 480p | 1-2 Mbps |
| 720p | 2-5 Mbps |
| 1080p | 5-10 Mbps |
| 4K | 20-50 Mbps |