---
name: ImageDefender
description: Adds adversarial watermarks to images to neutralize unauthorized AI photo modification. 85+ stars. Use when protecting images from AI manipulation, adding invisible adversarial noise to personal photos, preventing AI art generators from using your images, or researching adversarial examples in computer vision.
---

# ImageDefender

Protects images from unauthorized AI modification by embedding invisible adversarial perturbations that disrupt AI image processing models.

## Source
Repository: `elder-plinius/ImageDefender`
Stars: 85+ | License: GPL-3.0

## Quick Start

```bash
git clone https://github.com/elder-plinius/ImageDefender.git
cd ImageDefender
pip install -r requirements.txt

# Protect a single image
python imagedefender.py protect --input photo.jpg --output protected.jpg

# Protect all images in a directory
python imagedefender.py protect --directory ./photos/ --output ./protected/
```

## How It Works

ImageDefender applies adversarial perturbations — imperceptible pixel-level noise — that:
1. Are invisible to the human eye
2. Disrupt AI image recognition and generation models
3. Cause AI models to misinterpret the image content
4. Prevent style transfer and face swapping

## Protection Modes

```bash
# Standard protection (minimal quality loss)
python imagedefender.py protect --input photo.jpg --strength 0.03

# Strong protection (slight quality trade-off)
python imagedefender.py protect --input photo.jpg --strength 0.08

# Maximum protection (visible noise, maximum disruption)
python imagedefender.py protect --input photo.jpg --strength 0.15

# Targeted: protect against specific AI model
python imagedefender.py protect --input photo.jpg --target stable-diffusion

# Batch protection with quality report
python imagedefender.py protect --directory ./originals/ --output ./protected/ --report
```

## Verification

```bash
# Verify protection effectiveness
python imagedefender.py verify --original photo.jpg --protected protected.jpg

# Test against AI model
python imagedefender.py test --image protected.jpg --model dalle --scenario face-swap
```

## Protection Targets

| AI System | Effectiveness |
|-----------|-------------|
| DALL-E / GPT-4V | High |
| Stable Diffusion | High |
| Midjourney | Medium-High |
| Face Swap apps | High |
| AI image enhancers | Medium |

## Use Cases

1. **Personal Photo Protection** — Prevent AI face-swapping of personal photos
2. **Artist Protection** — Stop AI from learning your artistic style
3. **Privacy** — Protect identity in publicly shared images
4. **Research** — Study adversarial examples and AI robustness
5. **Content Control** — Maintain control over how your images are used
