---
name: open-generative-ai
description: Sets up and operates Open Generative AI — a free, self-hosted AI studio for image, video, cinema, and lip sync generation with 200+ models. Use when the user wants to install Open Generative AI, generate images or videos with AI, set up local inference, configure API keys, or build multi-step generative pipelines.
---

# Open Generative AI

A free, open-source AI studio with 200+ models for image generation, video creation, lip sync animation, cinema production, and workflow automation.

## When to Use This Skill

Use this skill when the user wants to:

- Install or set up Open Generative AI
- Generate images from text or reference images
- Create videos from text prompts or image frames
- Animate portrait photos with lip sync audio
- Build cinematic shots with professional camera controls
- Configure local inference (offline models)
- Set up API keys for cloud generation
- Build multi-step generative pipelines

## Installation

### Prerequisites

- Node.js v18 or higher
- A [Muapi.ai](https://muapi.ai) access key (for cloud models)

### Option 1 — Desktop App (Recommended)

Download the pre-built installer for your platform from the releases page:

```
https://github.com/Anil-matcha/Open-Generative-AI/releases
```

**macOS note:** If macOS blocks the unsigned app, run:

```bash
xattr -cr "/Applications/Open Generative AI.app"
```

Or go to **System Settings → Privacy & Security → Open Anyway**.

### Option 2 — From Source

```bash
git clone --recurse-submodules https://github.com/Anil-matcha/Open-Generative-AI.git
cd Open-Generative-AI
npm run setup
```

Run as desktop app:

```bash
npm run electron:dev
```

Run as web app:

```bash
npm run dev
```

## API Key Setup

1. Create an account at [muapi.ai](https://muapi.ai)
2. Generate an access key in the dashboard
3. Copy the **key value** (not the label)
4. On first launch, paste it when prompted

The key is stored in browser localStorage and only sent to Muapi's API — never elsewhere.

## Studio Modules

### Image Studio

Two modes — switch with the toggle at the top:

| Mode | Models | Notes |
|---|---|---|
| Text-to-Image | 50+ (Flux, Seedream 5.0, Nano Banana 2) | Prompt → image |
| Image-to-Image | 55+ | Upload up to 14 reference images for compatible models |

Controls available: quality, resolution, guidance scale (model-dependent).

### Video Studio

| Mode | Models | Notes |
|---|---|---|
| Text-to-Video | 40+ (Kling, Sora, Veo, Wan, Seedance 2.0) | Prompt → video |
| Image-to-Video | 60+ | Upload a start frame to animate |

Controls: aspect ratio, duration.

### Lip Sync Studio

Animate a portrait or re-lip-sync an existing video to audio.

| Input | Output |
|---|---|
| Portrait image + audio file | Talking-head video |
| Video file + audio file | Lip-synced video |

9 dedicated models available. Supported resolutions: 480p – 1080p.

### Cinema Studio

Professional camera parameters for cinematic shots:

- **Camera types:** 8K Digital, 70mm Film, and 4 others
- **Lenses:** Anamorphic, Macro, Prime, and 8 others
- **Focal length:** 8mm – 85mm
- **Aperture:** f/1.4 – f/11

### Workflow Studio

Build multi-step generative pipelines visually using a node editor:

1. Browse community templates or start from scratch
2. Connect generation steps (image → video → lip sync, etc.)
3. Execute via the playground interface or API endpoint

## Local Inference (Desktop Only)

Run models fully offline — no API key needed.

### Engine 1 — sd.cpp (bundled)

One-click install from **Settings → Local Models**.

| Model | Notes |
|---|---|
| Z-Image Turbo | Fast generation |
| Z-Image Base | Higher quality |
| Dreamshaper 8 | Stylized outputs |
| Realistic Vision | Photorealism |
| SDXL | High-res base model |

Hardware acceleration: Metal (Apple Silicon), CUDA / Vulkan / ROCm (Linux/Windows).

### Engine 2 — Wan2GP (BYO GPU Server)

Requires a separate CUDA or ROCm GPU server.

Models: Flux, Qwen Image, Wan 2.2, Hunyuan, LTX Video.

Setup:
1. Deploy Wan2GP on your GPU server
2. In **Settings → Local Models**, enter the server URL
3. Click **Test Connectivity**

## Environment Variables

| Variable | Purpose | Default |
|---|---|---|
| `OPEN_GENERATIVE_AI_LOCAL_AI_DIR` | Custom path for model weights and inference engine | Platform app-data directory |

## Model Storage Locations

| Platform | Path |
|---|---|
| macOS | `~/Library/Application Support/open-generative-ai/local-ai` |
| Windows | `%APPDATA%\open-generative-ai\local-ai` |
| Linux | `~/.config/open-generative-ai/local-ai` |

## Workflow

### Step 1: Determine the Task

Ask the user which studio they want to use if it isn't clear:

- Generating a static image → Image Studio
- Creating a video from a prompt or image → Video Studio
- Animating a talking portrait → Lip Sync Studio
- Cinematic shot with camera control → Cinema Studio
- Chained multi-step pipeline → Workflow Studio

### Step 2: Check Prerequisites

Verify:
- Node.js v18+ is installed (`node --version`)
- API key is available (for cloud models) or local inference is configured

### Step 3: Run Setup

For source installs, always clone with submodules:

```bash
git clone --recurse-submodules https://github.com/Anil-matcha/Open-Generative-AI.git
cd Open-Generative-AI
npm run setup
```

### Step 4: Launch and Configure

- Start the app and enter the Muapi API key on first launch
- For local inference, go to **Settings → Local Models** and install the sd.cpp engine
- Select the appropriate studio module

### Step 5: Generate

- Write a clear, descriptive prompt
- Select a model suited to the task
- Adjust quality and resolution controls
- Submit and wait for the result

## Troubleshooting

| Problem | Fix |
|---|---|
| macOS "app is damaged" warning | Run `xattr -cr "/Applications/Open Generative AI.app"` |
| API key not working | Make sure you copied the **value**, not the label |
| Local models not appearing | Check **Settings → Local Models**, re-install engine |
| Submodule errors on clone | Use `git clone --recurse-submodules` |
| Generation fails silently | Check Muapi balance at muapi.ai dashboard |

## Community & Support

- Reddit: [r/muapi](https://reddit.com/r/muapi)
- Discord: linked from the Muapi.ai website
- GitHub Issues: https://github.com/Anil-matcha/Open-Generative-AI/issues
