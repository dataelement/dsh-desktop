# AI 生成工具：广告创意制作

使用 AI 图像生成器、视频生成器和代码化视频工具大规模制作广告视觉素材的参考指南。

---

## 何时使用生成工具

| 需求 | 工具类别 | 推荐方案 |
|------|----------|----------|
| 静态广告图片（横幅、社交媒体） | 图片生成 | Flux、Ideogram |
| 带文字叠加的广告图片 | 图片生成（文字能力强） | Ideogram |
| 短视频广告（6-30秒） | 视频生成 | Veo、Kling、Runway、Seedance |
| 带配音的视频广告 | 视频生成+语音 | Veo/Seedance（原生音频），或 Runway + ElevenLabs |
| 广告配音音轨 | 语音生成 | ElevenLabs、Cartesia |
| 多语言广告版本 | 语音生成 | ElevenLabs、PlayHT |
| 品牌声音克隆 | 语音生成 | ElevenLabs、Resemble AI |
| 产品模型和变体 | 图片生成+参考图 | Flux（多图参考） |
| 模板化大规模视频 | 代码化视频 | Remotion |
| 个性化视频（姓名、数据） | 代码化视频 | Remotion |
| 品牌风格一致的变体 | 图片生成+风格参考 | Flux、Ideogram |

---

## 图片生成

### Flux（Black Forest Labs）

开源图片生成模型，通过 Replicate 和 BFL 原生 API 提供服务。

**最适合：** 写实图片、品牌风格一致的变体、多参考图生成
**API：** Replicate、BFL API、fal.ai
**定价：** 约$0.01-0.06/张，取决于模型和分辨率

**模型版本：**
| 模型 | 速度 | 质量 | 成本 | 最适合 |
|------|------|------|------|--------|
| Flux 2 Pro | ~6秒 | 最高 | $0.015/MP | 最终生产素材 |
| Flux 2 Flex | ~22秒 | 高+可编辑 | $0.06/MP | 迭代编辑 |
| Flux 2 Dev | ~2.5秒 | 良好 | $0.012/MP | 快速原型 |
| Flux 2 Klein | 最快 | 良好 | 最低 | 大批量生成 |

**优势：**
- 多图参考（最多8张）实现广告间身份一致性
- 产品一致性——同一产品在不同场景中呈现
- 参考图风格迁移
- 开源 Dev 模型可自托管

**广告创意用例：**
- 生成50+变体，保持产品/人物一致性
- 创建产品场景图（你的 SaaS 产品在不同设备上的效果）
- 使用参考图匹配现有品牌素材风格
- 快速生成 A/B 测试图片变体

**文档：** [Replicate Flux](https://replicate.com/black-forest-labs/flux-2-pro)、[BFL API](https://docs.bfl.ml/)

---

### Ideogram

专注于图片中的排版和文字渲染。

**最适合：** 带文字的广告横幅、品牌图形、带标题的社交广告图
**API：** Ideogram API、Runware
**定价：** 约$0.06/张（API），约$0.009/张（订阅）

**优势：**
- 业界领先的文字渲染能力（约90%准确率，多数工具仅约30%）
- 风格参考系统（可上传最多3张参考图）
- 43亿种风格预设，保证品牌美学一致性
- 擅长 Logo 和品牌字体排版

**广告创意用例：**
- 生成直接包含标题文字的广告横幅
- 创建带品牌文字叠加的社交媒体图
- 批量生成排版风格一致的设计变体
- 无需每次都找设计师即可产出推广素材

**文档：** [Ideogram API](https://developer.ideogram.ai/)、[Ideogram](https://ideogram.ai/)

---

### 其他图片工具

| 工具 | 最适合 | API状态 | 说明 |
|------|--------|---------|------|
| **Stable Diffusion** | 自托管、可定制 | 开源 | 适合有GPU基础设施的团队 |

---

## 视频生成

### Veo

先进的 AI 视频生成模型，支持原生音频。

**最适合：** 高质量视频广告（原生音频）、竖版社交视频
**API：** 官方云端 API
**定价：** 约$0.15/秒（快速模式），约$0.40/秒（标准模式）

**能力：**
- 最长60秒、1080p
- 原生音频生成（对白、音效、环境音）
- 竖版9:16输出，适配 Stories/Reels/Shorts
- 可放大至4K
- 文生视频和图生视频

**广告创意用例：**
- 从文字描述生成短视频广告（15-30秒）
- 创建适合 TikTok、Reels、Shorts 的竖版视频广告
- 制作带配音的产品演示
- 用同一提示词生成不同风格的多个视频变体

---

### Kling（快手）

支持音视频同步生成和镜头控制的视频生成工具。

**最适合：** 电影感视频广告、较长内容、音频同步视频
**API：** Kling API、PiAPI、fal.ai
**定价：** 约$0.09/秒（通过 fal.ai 第三方）

**能力：**
- 最长3分钟、1080p/30-48fps
- 音视频同步生成（Kling 2.6）
- 文生视频和图生视频
- 运动和镜头控制

**广告创意用例：**
- 较长的产品讲解视频
- 带同步音频的电影感品牌视频
- 将产品图片动画化为视频广告

**文档：** [Kling AI Developer](https://klingai.com/global/dev/model/video)

---

### Runway

视频生成与编辑平台，可控性强。

**最适合：** 可控的视频生成、风格一致的内容、编辑现有素材
**API：** Runway 开发者门户

**能力：**
- Gen-4：跨镜头保持角色/场景一致性
- 运动笔刷和镜头控制
- 图生视频（支持参考图）
- 视频到视频的风格迁移

**广告创意用例：**
- 生成跨场景角色/产品一致的视频广告
- 将现有素材风格迁移以匹配品牌美学
- 扩展或重新混剪已有视频内容

**文档：** [Runway API](https://docs.dev.runwayml.com/)

---

### Seedance 2.0（字节跳动）

字节跳动的视频生成模型，支持音视频同步生成和多模态输入。

**最适合：** 快速、低成本、原生音频的视频广告，多模态参考输入
**API：** BytePlus（官方）、Replicate、WaveSpeedAI、fal.ai（第三方）
**定价：** 约$0.10-0.80/分钟（取决于分辨率）

**能力：**
- 最长20秒、最高2K分辨率
- 音视频同步生成（双分支扩散Transformer）
- 文生视频和图生视频
- 最多12个参考文件作为多模态输入

**广告创意用例：**
- 大批量低成本短视频广告生产
- 一次生成包含同步配音和音效的视频广告
- 多参考生成（输入产品图、品牌素材、风格参考）
- 快速迭代视频广告创意

**文档：** [Seedance](https://seed.bytedance.com/en/seedance2_0)

---

### Higgsfield

全流程视频创作平台，具备电影级镜头控制。

**最适合：** 社交视频广告、电影感风格、移动端优先内容
**平台：** [higgsfield.ai](https://higgsfield.ai/)

**能力：**
- 50+种专业镜头运动（变焦、平移、FPV无人机镜头）
- 图片转视频动画
- 内置编辑、转场和关键帧
- 一体化工作流：图片生成、动画、编辑

**广告创意用例：**
- 具备电影感的社交媒体视频广告
- 将产品图片动画化为动态视频
- 用不同镜头风格创建多个视频变体
- 快速为社交活动产出视频内容

---

### 视频工具对比

| 工具 | 最长时长 | 音频 | 分辨率 | API | 最适合 |
|------|----------|------|--------|-----|--------|
| **Veo** | 60秒 | 原生 | 1080p/4K | 官方 | 竖版社交视频 |
| **Kling 2.6** | 3分钟 | 原生 | 1080p | 第三方 | 较长电影感内容 |
| **Runway Gen-4** | 10秒 | 无 | 1080p | 官方 | 可控、一致性 |
| **Seedance 2.0** | 20秒 | 原生 | 2K | 官方+第三方 | 低成本大批量 |
| **Higgsfield** | 不定 | 有 | 1080p | 网页版 | 社交、移动端优先 |

---

## 语音与音频生成

用于为视频广告叠加逼真配音、为产品演示添加旁白，或为 Remotion 渲染的视频生成音频。这些工具能将广告脚本转化为自然流畅的语音音轨。

### 何时使用语音工具

许多视频生成工具（Veo、Kling、Seedance）现在已包含原生音频。在以下情况使用独立语音工具：

- **为无声视频配音** — Runway Gen-4 和 Remotion 输出无声视频
- **品牌声音一致性** — 克隆特定声音用于所有广告
- **多语言版本** — 同一广告脚本用20+种语言输出
- **脚本迭代** — 无需重新拍摄即可重录配音
- **精确控制** — 精确的时间、情感和节奏

---

### ElevenLabs

真实语音生成和声音克隆领域的市场领导者。

**最适合：** 最自然的配音效果、品牌声音克隆、多语言
**API：** REST API，支持流式传输
**定价：** 约$0.12-0.30/千字符（取决于套餐）；起价$5/月

**能力：**
- 29+种语言，自然口音和语调
- 从短音频片段克隆声音（即时模式）或较长录音（专业模式）
- 情感和风格控制
- 流式传输实时生成
- 语音库包含数百种预置声音

**广告创意用例：**
- 为视频广告生成配音音轨
- 克隆品牌代言人声音用于所有广告变体
- 从一份脚本生成10+种语言版本
- A/B 测试不同声音风格（权威感 vs. 亲和力 vs. 紧迫感）

**API 示例：**
```bash
curl -X POST "https://api.elevenlabs.io/v1/text-to-speech/{voice_id}" \
  -H "xi-api-key: $ELEVENLABS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Stop wasting hours on manual reporting. Try DataFlow free for 14 days.",
    "model_id": "eleven_multilingual_v2",
    "voice_settings": {"stability": 0.5, "similarity_boost": 0.75}
  }' --output voiceover.mp3
```

**文档：** [ElevenLabs API](https://elevenlabs.io/docs/api-reference/text-to-speech)

---

### Cartesia Sonic

超低延迟语音生成，专为实时应用打造。

**最适合：** 实时语音、最低延迟、情感表现力
**API：** REST + WebSocket 流式传输
**定价：** 起价$5/月；按量付费从$0.03/分钟起

**能力：**
- 40ms 首字节音频延迟（业界最快）
- 15+种语言
- 非语言表现力：笑声、呼吸、情感变化
- Sonic Turbo 模式更低延迟
- 流式 API 支持实时生成

**广告创意用例：**
- 创意迭代过程中实时预览广告语音
- 带动态旁白的互动演示视频
- 需要自然笑声、叹息或情感反应的广告

**文档：** [Cartesia Sonic](https://docs.cartesia.ai/build-with-cartesia/tts-models/latest)

---

### Voicebox（开源）

免费、本地优先的语音合成工作室，基于 Qwen3-TTS。ElevenLabs 的开源替代方案。

**最适合：** 免费声音克隆、本地/私密生成、零成本批量生产
**API：** 本地 REST API `http://localhost:8000`
**定价：** 免费（MIT 许可证），完全在本地运行。
**技术栈：** Tauri (Rust) + React + FastAPI (Python)

**能力：**
- 通过 Qwen3-TTS 从短音频样本克隆声音
- 多语言支持（英语、中文及更多计划中）
- 多轨时间线编辑器，可编排对话
- Apple Silicon 上通过 MLX Metal 加速，推理速度提升4-5倍
- 本地 REST API 支持编程式生成
- 无云端依赖——所有处理均在本机完成

**广告创意用例：**
- 免费克隆品牌代言人声音用于所有广告变体
- 批量生成配音，无按字符计费
- 广告内容敏感或尚未发布时的私密本地生成
- 在投入付费服务前先测试不同声音变体

**API 示例：**
```bash
curl -X POST http://localhost:8000/generate \
  -H "Content-Type: application/json" \
  -d '{"text": "Stop wasting hours on manual reporting.", "profile_id": "abc123", "language": "en"}'
```

**安装：** 可从 [voicebox.sh](https://voicebox.sh) 下载 macOS 和 Windows 桌面应用，或从源码构建：
```bash
git clone https://github.com/jamiepine/voicebox.git
cd voicebox && make setup && make dev
```

**文档：** [GitHub](https://github.com/jamiepine/voicebox)

---

### 其他语音工具

| 工具 | 最适合 | 差异化优势 | API |
|------|--------|-----------|-----|
| **PlayHT** | 大规模语音库、低延迟 | 900+声音、<300ms延迟、超逼真 | [play.ht](https://play.ht/) |
| **Resemble AI** | 企业级声音克隆 | 支持私有化部署、实时语音转换 | [resemble.ai](https://www.resemble.ai/) |
| **WellSaid Labs** | 合规、商用安全的声音 | 声音来自获得报酬的演员，适合商用 | [wellsaid.io](https://www.wellsaid.io/) |
| **Fish Audio** | 高性价比、情感控制 | 比 ElevenLabs 便宜约50-70%、支持情感标签 | [fish.audio](https://fish.audio/) |
| **Murf AI** | 非技术团队 | 浏览器端工作室、200+声音 | [murf.ai](https://murf.ai/) |

---

### 语音工具对比

| 工具 | 质量 | 克隆 | 语言数 | 延迟 | 千字符价格 |
|------|------|------|--------|------|-----------|
| **ElevenLabs** | 最佳 | 支持（即时+专业） | 29+ | ~200ms | $0.12-0.30 |
| **Cartesia Sonic** | 很好 | 不支持 | 15+ | ~40ms | ~$0.03/分钟 |
| **PlayHT** | 很好 | 支持 | 140+ | <300ms | ~$0.10-0.20 |
| **Fish Audio** | 良好 | 支持 | 13+ | ~200ms | ~$0.05-0.10 |
| **WellSaid** | 很好 | 不支持（演员声音） | 英语 | ~300ms | 定制定价 |
| **Voicebox** | 良好 | 支持（本地） | 2+ | 本地 | 免费（开源） |

### 如何选择语音工具

```
需要为广告配音？
├── 需要克隆特定品牌声音？
│   ├── 最佳质量 → ElevenLabs
│   ├── 企业/私有化部署 → Resemble AI
│   └── 高性价比 → Fish Audio、PlayHT
├── 需要多语言（同一广告多种语言）？
│   ├── 最多语言 → PlayHT（140+）
│   └── 最佳质量 → ElevenLabs（29+）
├── 需要免费/开源/本地运行？
│   └── Voicebox（MIT许可，在本机运行）
├── 需要低成本、快速、质量够用？
│   └── 通用AI语音合成（$0.015/分钟）
├── 需要商用合规授权？
│   └── WellSaid Labs（演员获酬声音）
└── 需要实时/交互？
    └── Cartesia Sonic（40ms首字节）
```

### 工作流：语音 + 视频

```
1. 撰写广告脚本（使用本广告创意技能生成文案）
2. 用 ElevenLabs 等工具生成配音
3. 生成或渲染视频：
   a. 用 Runway/Remotion 生成无声视频 → 叠加语音音轨
   b. 或使用 Veo/Seedance 的原生音频（无需单独配音）
4. 如需分别叠加，使用 ffmpeg 合成：
   ffmpeg -i video.mp4 -i voiceover.mp3 -c:v copy -c:a aac output.mp4
5. 生成变体（不同脚本、声音或语言）
```

---

## 代码化视频：Remotion

用于模板化、数据驱动的大规模视频广告，Remotion 是最佳选择。与 AI 视频生成器从提示词生成独特视频不同，Remotion 使用 React 代码从模板和数据渲染确定性的、品牌完美匹配的视频。

**最适合：** 模板化广告变体、个性化视频、品牌一致的批量生产
**技术栈：** React + TypeScript
**定价：** 个人/小团队免费；4人以上需商业许可
**文档：** [remotion.dev](https://www.remotion.dev/)

### 为什么用 Remotion 做广告

| AI 视频生成器 | Remotion |
|---------------|----------|
| 每次输出独特结果 | 确定性、像素级精确 |
| 基于提示词，控制力有限 | 代码控制每一帧 |
| 难以精确匹配品牌 | 精确的品牌色、字体、间距 |
| 逐一生成 | 从数据批量渲染数百条 |
| 无法插入动态数据 | 可用姓名、价格、统计数据个性化 |

### 广告创意用例

**1. 动态产品广告**
输入产品 JSON 数组，为每个产品渲染独立的视频广告：
```tsx
// Simplified Remotion component for product ads
export const ProductAd: React.FC<{
  productName: string;
  price: string;
  imageUrl: string;
  tagline: string;
}> = ({productName, price, imageUrl, tagline}) => {
  return (
    <AbsoluteFill style={{backgroundColor: '#fff'}}>
      <Img src={imageUrl} style={{width: 400, height: 400}} />
      <h1>{productName}</h1>
      <p>{tagline}</p>
      <div className="price">{price}</div>
      <div className="cta">Shop Now</div>
    </AbsoluteFill>
  );
};
```

**2. A/B 测试视频变体**
用不同标题、CTA 或配色方案渲染同一模板：
```tsx
const variations = [
  {headline: "Save 50% Today", cta: "Get the Deal", theme: "urgent"},
  {headline: "Join 10K+ Teams", cta: "Start Free", theme: "social-proof"},
  {headline: "Built for Speed", cta: "Try It Now", theme: "benefit"},
];
// Render all variations programmatically
```

**3. 个性化外展视频**
生成称呼潜在客户姓名的视频，用于冷启动联系或销售。

**4. 社交广告批量生产**
以不同宽高比渲染同一内容：
- 1:1 用于信息流
- 9:16 用于 Stories/Reels
- 16:9 用于 YouTube

### Remotion 广告创意工作流

```
1. 用 React 设计模板（或用 AI 生成组件）
2. 定义数据结构（产品、标题、CTA、图片）
3. 将数据数组输入模板
4. 批量渲染所有变体
5. 上传至广告平台
```

### 快速开始

```bash
# Create a new Remotion project
npx create-video@latest

# Render a single video
npx remotion render src/index.ts MyComposition out/video.mp4

# Batch render from data
npx remotion render src/index.ts MyComposition --props='{"data": [...]}'
```

---

## 如何选择合适的工具

### 决策树

```
需要视频广告？
├── 模板化、数据驱动（相同结构，不同数据）
│   └── 使用 Remotion
├── 基于提示词的独特创意（探索性）
│   ├── 需要对白/配音？ → Veo、Kling 2.6、Seedance 2.0
│   ├── 需要跨场景一致性？ → Runway Gen-4
│   ├── 需要竖版社交视频？ → Veo（原生9:16）
│   ├── 需要大批量低成本？ → Seedance 2.0
│   └── 需要电影级镜头？ → Higgsfield、Kling
└── 两者都需要 → AI生成主力创意，Remotion批量变体

需要图片广告？
├── 需要图片中包含文字/标题？ → Ideogram
├── 需要产品跨变体一致性？ → Flux（多参考图）
├── 需要最高视觉质量？ → Flux Pro
└── 需要大批量低成本？ → Flux Klein
```

### 100个广告变体的成本对比

| 方案 | 工具 | 大致成本 |
|------|------|----------|
| 100张静态图片 | Flux Dev | ~$1-2 |
| 100张静态图片 | Ideogram API | ~$6 |
| 100×15秒视频 | Veo快速模式 | ~$225 |
| 100×15秒视频 | Remotion（模板化） | ~$0（自托管渲染） |
| 10条主力视频+90条模板化 | Veo + Remotion | ~$22 + 渲染时间 |

### 规模化广告生产推荐工作流

1. **用 AI 生成主力创意**（Flux、Veo 等）——高质量、探索性
2. **基于优胜创意模式构建 Remotion 模板**
3. **用 Remotion 配合数据批量生产变体**（产品、标题、CTA）
4. **持续迭代** — AI 工具探索新角度，Remotion 实现规模化

这种混合方案兼具 AI 生成器的创意探索能力和代码化渲染的一致性与规模效率。

---

## 各平台广告图片规格

生成广告图片时，请指定正确的尺寸：

| 平台 | 版位 | 宽高比 | 推荐尺寸 |
|------|------|--------|----------|
| Meta 信息流 | 单图 | 1:1 | 1080x1080 |
| Meta Stories/Reels | 竖版 | 9:16 | 1080x1920 |
| Meta 轮播 | 方形 | 1:1 | 1080x1080 |
| Google 展示广告 | 横版 | 1.91:1 | 1200x628 |
| Google 展示广告 | 方形 | 1:1 | 1200x1200 |
| LinkedIn 信息流 | 横版 | 1.91:1 | 1200x627 |
| LinkedIn 信息流 | 方形 | 1:1 | 1200x1200 |
| TikTok 信息流 | 竖版 | 9:16 | 1080x1920 |
| Twitter/X 信息流 | 横版 | 16:9 | 1200x675 |
| Twitter/X 卡片 | 横版 | 1.91:1 | 800x418 |

在生成提示词中包含这些尺寸，避免后期裁切或调整大小。
