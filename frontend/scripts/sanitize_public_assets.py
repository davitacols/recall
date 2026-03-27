from __future__ import annotations

from pathlib import Path
from statistics import mean

from PIL import Image, ImageDraw, ImageFont


ASSET_DIR = Path("frontend/public/assets")
PNG_FILES = sorted(ASSET_DIR.glob("*.png"))
FONT_CANDIDATES = [
    Path("C:/Windows/Fonts/seguisb.ttf"),
    Path("C:/Windows/Fonts/segoeuib.ttf"),
    Path("C:/Windows/Fonts/segoeui.ttf"),
]


def get_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for candidate in FONT_CANDIDATES:
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size=size)
    return ImageFont.load_default()


def clamp(value: int, low: int, high: int) -> int:
    return max(low, min(value, high))


def sample_fill(image: Image.Image, x: int, y: int, width: int, height: int) -> tuple[int, int, int]:
    sx0 = clamp(x - 4, 0, image.width - 1)
    sx1 = clamp(x + width + 4, 1, image.width)
    sy0 = clamp(y - height - 8, 0, image.height - 1)
    sy1 = clamp(y - 8, 1, image.height)

    region = image.crop((sx0, sy0, sx1, sy1)).convert("RGB")
    pixels = list(region.getdata())
    if not pixels:
        return (249, 247, 242)

    return tuple(int(mean(channel)) for channel in zip(*pixels))


def sanitize_image(path: Path) -> None:
    with Image.open(path).convert("RGBA") as image:
        width, height = image.size

        chip_width = round(width * 0.145)
        chip_height = round(height * 0.05)
        chip_width = clamp(chip_width, 176, 220)
        chip_height = clamp(chip_height, 32, 42)
        x = width - chip_width - 6
        y = height - chip_height - 6

        fill = sample_fill(image, x, y, chip_width, chip_height)
        text_color = tuple(max(0, channel - 108) for channel in fill)

        overlay = Image.new("RGBA", image.size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)

        draw.rounded_rectangle(
            (x, y, x + chip_width, y + chip_height),
            radius=chip_height // 2,
            fill=(*fill, 246),
            outline=(0, 0, 0, 0),
        )

        font = get_font(max(12, chip_height - 17))
        label = "Knoledgr"
        bbox = draw.textbbox((0, 0), label, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        tx = x + (chip_width - text_width) / 2
        ty = y + (chip_height - text_height) / 2 - 1
        draw.text((tx, ty), label, font=font, fill=(*text_color, 228))

        cleaned = Image.alpha_composite(image, overlay).convert("RGB")
        cleaned.save(path, optimize=True)


def main() -> None:
    for path in PNG_FILES:
        sanitize_image(path)
        print(f"Sanitized {path}")


if __name__ == "__main__":
    main()
