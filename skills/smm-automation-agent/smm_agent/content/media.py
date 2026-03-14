"""Media processing utilities for images and video."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from PIL import Image


@dataclass
class MediaSpec:
    """Platform-specific media specifications."""

    width: int
    height: int
    max_file_size_mb: float = 10.0
    format: str = "JPEG"


PLATFORM_MEDIA_SPECS: dict[str, dict[str, MediaSpec]] = {
    "instagram": {
        "feed_square": MediaSpec(1080, 1080),
        "feed_portrait": MediaSpec(1080, 1350),
        "feed_landscape": MediaSpec(1080, 566),
        "story": MediaSpec(1080, 1920),
        "reel": MediaSpec(1080, 1920),
    },
    "twitter": {
        "in_stream": MediaSpec(1200, 675),
        "single_image": MediaSpec(1200, 1200),
    },
    "linkedin": {
        "shared_image": MediaSpec(1200, 627),
        "profile_banner": MediaSpec(1584, 396),
    },
    "facebook": {
        "shared_image": MediaSpec(1200, 630),
        "story": MediaSpec(1080, 1920),
    },
    "pinterest": {
        "standard_pin": MediaSpec(1000, 1500),
        "square_pin": MediaSpec(1000, 1000),
    },
    "tiktok": {
        "video_cover": MediaSpec(1080, 1920),
    },
    "youtube": {
        "thumbnail": MediaSpec(1280, 720),
        "shorts_cover": MediaSpec(1080, 1920),
    },
}


class MediaProcessor:
    """Process and optimize media for social media platforms."""

    def __init__(self, output_dir: str = "./media_output") -> None:
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def resize_image(
        self,
        image_path: str,
        platform: str,
        variant: str = "feed_square",
    ) -> str:
        """Resize image to platform specifications."""
        specs = PLATFORM_MEDIA_SPECS.get(platform, {})
        spec = specs.get(variant)
        if not spec:
            raise ValueError(f"No spec for {platform}/{variant}")

        img = Image.open(image_path)
        img = img.resize((spec.width, spec.height), Image.LANCZOS)

        output_name = f"{Path(image_path).stem}_{platform}_{variant}.{spec.format.lower()}"
        output_path = self.output_dir / output_name
        img.save(str(output_path), spec.format, quality=95)

        return str(output_path)

    def optimize_image(
        self, image_path: str, max_size_mb: float = 5.0
    ) -> str:
        """Optimize image file size while maintaining quality."""
        img = Image.open(image_path)
        output_path = self.output_dir / f"optimized_{Path(image_path).name}"

        quality = 95
        while quality > 20:
            img.save(str(output_path), "JPEG", quality=quality, optimize=True)
            size_mb = os.path.getsize(str(output_path)) / (1024 * 1024)
            if size_mb <= max_size_mb:
                break
            quality -= 5

        return str(output_path)

    def create_text_overlay(
        self,
        image_path: str,
        text: str,
        position: str = "center",
        font_size: int = 48,
    ) -> str:
        """Add text overlay to an image."""
        from PIL import ImageDraw, ImageFont

        img = Image.open(image_path).convert("RGBA")
        overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)

        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", font_size)
        except (OSError, IOError):
            font = ImageFont.load_default()

        # Calculate text position
        bbox = draw.textbbox((0, 0), text, font=font)
        text_w = bbox[2] - bbox[0]
        text_h = bbox[3] - bbox[1]

        if position == "center":
            x = (img.width - text_w) // 2
            y = (img.height - text_h) // 2
        elif position == "bottom":
            x = (img.width - text_w) // 2
            y = img.height - text_h - 40
        elif position == "top":
            x = (img.width - text_w) // 2
            y = 40
        else:
            x, y = 40, 40

        # Draw text shadow
        draw.text((x + 2, y + 2), text, font=font, fill=(0, 0, 0, 180))
        # Draw text
        draw.text((x, y), text, font=font, fill=(255, 255, 255, 255))

        result = Image.alpha_composite(img, overlay)
        output_path = self.output_dir / f"overlay_{Path(image_path).name}"
        result.save(str(output_path), "PNG")

        return str(output_path)

    def get_specs(
        self, platform: str
    ) -> dict[str, MediaSpec]:
        """Get all media specifications for a platform."""
        return PLATFORM_MEDIA_SPECS.get(platform, {})

    def batch_resize(
        self,
        image_path: str,
        platforms: list[str],
    ) -> dict[str, list[str]]:
        """Resize an image for multiple platforms at once."""
        results: dict[str, list[str]] = {}
        for platform in platforms:
            specs = PLATFORM_MEDIA_SPECS.get(platform, {})
            results[platform] = []
            for variant in specs:
                try:
                    path = self.resize_image(image_path, platform, variant)
                    results[platform].append(path)
                except Exception:
                    continue
        return results
