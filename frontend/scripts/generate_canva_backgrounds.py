from pathlib import Path

from PIL import Image, ImageDraw

from generate_sora_upload_images import (
    COLORS,
    brandlogo_art,
    brandmark_art,
    color_with_alpha,
    draw_grid_on,
    memory_orbit_art,
)


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "public" / "brand" / "social" / "canva" / "backgrounds"

SPECS = [
    {"slug": "knoledgr-background-light-portrait", "size": (2160, 2700), "mode": "light", "platform": "instagram portrait"},
    {"slug": "knoledgr-background-light-square", "size": (2160, 2160), "mode": "light", "platform": "instagram square"},
    {"slug": "knoledgr-background-light-landscape", "size": (2400, 1260), "mode": "light", "platform": "facebook landscape"},
    {"slug": "knoledgr-background-dark-portrait", "size": (2160, 2700), "mode": "dark", "platform": "instagram portrait"},
    {"slug": "knoledgr-background-dark-square", "size": (2160, 2160), "mode": "dark", "platform": "instagram square"},
    {"slug": "knoledgr-background-dark-landscape", "size": (2400, 1260), "mode": "dark", "platform": "facebook landscape"},
]


def category_for_size(width, height):
    if width > height:
        return "landscape"
    if width == height:
        return "square"
    return "portrait"


def new_rgba(width, height, color):
    return Image.new("RGBA", (width, height), color)


def save_versions(image, name):
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    png_path = OUTPUT_DIR / f"{name}.png"
    jpg_path = OUTPUT_DIR / f"{name}.jpg"
    image.save(png_path, format="PNG", optimize=True)
    image.convert("RGB").save(jpg_path, format="JPEG", quality=95, optimize=True)


def soften(image, opacity):
    faded = image.copy()
    alpha = faded.getchannel("A").point(lambda p: int(p * opacity))
    faded.putalpha(alpha)
    return faded


def arc_bundle(draw, rects, angles, color, width):
    for rect, (start, end), alpha in zip(rects, angles, [86, 58, 34]):
        draw.arc(rect, start=start, end=end, fill=color_with_alpha(color, alpha), width=width)


def compose_mark(base, x, y, size, opacity):
    mark = soften(brandmark_art(size=size), opacity)
    base.alpha_composite(mark, (x, y))


def compose_logo(base, x, y, width, height, opacity):
    logo = soften(brandlogo_art(width=width, height=height), opacity)
    base.alpha_composite(logo, (x, y))


def compose_orbit(base, x, y, width, height, opacity):
    orbit = soften(memory_orbit_art(width=width, height=height), opacity)
    base.alpha_composite(orbit, (x, y))


def build_light_background(width, height):
    category = category_for_size(width, height)
    base = new_rgba(width, height, COLORS["paper"])
    overlay = new_rgba(width, height, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    draw_grid_on(draw, width, height, step=max(96, width // 18), color=COLORS["linen"], alpha=42)
    draw.ellipse((int(width * 0.58), int(-0.08 * height), int(width * 1.08), int(height * 0.44)), fill=color_with_alpha(COLORS["amber"], 22))
    draw.ellipse((int(-0.18 * width), int(height * 0.56), int(width * 0.42), int(height * 1.06)), fill=color_with_alpha(COLORS["blue"], 18))

    if category == "landscape":
        rects = [
            (int(width * 0.34), int(-0.08 * height), int(width * 1.06), int(height * 0.92)),
            (int(width * 0.46), int(0.06 * height), int(width * 1.0), int(height * 0.84)),
            (int(width * 0.56), int(0.16 * height), int(width * 0.96), int(height * 0.76)),
        ]
        orbit_box = (int(width * 0.58), int(height * 0.2), int(width * 0.3), int(height * 0.44))
        mark_box = (int(width * 0.84), int(height * 0.78), int(min(width, height) * 0.08))
    elif category == "square":
        rects = [
            (int(width * 0.18), int(0.08 * height), int(width * 0.98), int(height * 0.98)),
            (int(width * 0.28), int(0.18 * height), int(width * 0.94), int(height * 0.92)),
            (int(width * 0.4), int(0.26 * height), int(width * 0.92), int(height * 0.86)),
        ]
        orbit_box = (int(width * 0.48), int(height * 0.56), int(width * 0.38), int(height * 0.28))
        mark_box = (int(width * 0.1), int(height * 0.84), int(min(width, height) * 0.09))
    else:
        rects = [
            (int(width * 0.1), int(0.18 * height), int(width * 1.02), int(height * 1.02)),
            (int(width * 0.2), int(0.28 * height), int(width * 0.96), int(height * 0.96)),
            (int(width * 0.3), int(0.4 * height), int(width * 0.9), int(height * 0.92)),
        ]
        orbit_box = (int(width * 0.36), int(height * 0.66), int(width * 0.46), int(height * 0.2))
        mark_box = (int(width * 0.74), int(height * 0.1), int(min(width, height) * 0.08))

    arc_bundle(
        draw,
        rects,
        [(212, 334), (220, 330), (228, 326)],
        COLORS["blue"],
        max(3, width // 380),
    )
    base.alpha_composite(overlay)
    compose_orbit(base, orbit_box[0], orbit_box[1], orbit_box[2], orbit_box[3], 0.18)
    compose_mark(base, mark_box[0], mark_box[1], mark_box[2], 0.14)
    return base


def build_dark_background(width, height):
    category = category_for_size(width, height)
    base = new_rgba(width, height, COLORS["night"])
    overlay = new_rgba(width, height, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    draw.ellipse((int(-0.16 * width), int(-0.08 * height), int(width * 0.6), int(height * 0.7)), fill=color_with_alpha(COLORS["blue"], 24))
    draw.ellipse((int(width * 0.46), int(0.18 * height), int(width * 1.1), int(height * 1.02)), fill=color_with_alpha(COLORS["amber"], 18))
    draw.ellipse((int(width * 0.18), int(0.08 * height), int(width * 0.88), int(height * 0.82)), fill=color_with_alpha(COLORS["paper"], 8))

    if category == "landscape":
        rects = [
            (int(width * 0.38), int(-0.08 * height), int(width * 1.08), int(height * 0.94)),
            (int(width * 0.5), int(0.04 * height), int(width * 1.02), int(height * 0.84)),
            (int(width * 0.6), int(0.16 * height), int(width * 0.98), int(height * 0.76)),
        ]
        orbit_box = (int(width * 0.6), int(height * 0.18), int(width * 0.28), int(height * 0.44))
        logo_box = (int(width * 0.72), int(height * 0.8), int(width * 0.18), int(height * 0.08))
        mark_box = (int(width * 0.1), int(height * 0.82), int(min(width, height) * 0.08))
    elif category == "square":
        rects = [
            (int(width * 0.14), int(0.08 * height), int(width * 0.98), int(height * 0.98)),
            (int(width * 0.24), int(0.18 * height), int(width * 0.94), int(height * 0.92)),
            (int(width * 0.34), int(0.28 * height), int(width * 0.92), int(height * 0.86)),
        ]
        orbit_box = (int(width * 0.48), int(height * 0.56), int(width * 0.38), int(height * 0.28))
        logo_box = (int(width * 0.08), int(height * 0.1), int(width * 0.22), int(height * 0.1))
        mark_box = (int(width * 0.82), int(height * 0.1), int(min(width, height) * 0.08))
    else:
        rects = [
            (int(width * 0.08), int(0.18 * height), int(width * 1.02), int(height * 1.02)),
            (int(width * 0.18), int(0.28 * height), int(width * 0.96), int(height * 0.96)),
            (int(width * 0.3), int(0.4 * height), int(width * 0.92), int(height * 0.92)),
        ]
        orbit_box = (int(width * 0.34), int(height * 0.68), int(width * 0.5), int(height * 0.18))
        logo_box = (int(width * 0.08), int(height * 0.08), int(width * 0.24), int(height * 0.08))
        mark_box = (int(width * 0.8), int(height * 0.12), int(min(width, height) * 0.08))

    arc_bundle(
        draw,
        rects,
        [(214, 332), (222, 328), (230, 324)],
        COLORS["blue"],
        max(3, width // 360),
    )
    base.alpha_composite(overlay)
    compose_orbit(base, orbit_box[0], orbit_box[1], orbit_box[2], orbit_box[3], 0.14)
    compose_logo(base, logo_box[0], logo_box[1], logo_box[2], logo_box[3], 0.12)
    compose_mark(base, mark_box[0], mark_box[1], mark_box[2], 0.16)
    return base


def contact_sheet():
    columns = 2
    tile_w = 600
    tile_h = 675
    files = [
        OUTPUT_DIR / "knoledgr-background-light-portrait.jpg",
        OUTPUT_DIR / "knoledgr-background-dark-portrait.jpg",
        OUTPUT_DIR / "knoledgr-background-light-square.jpg",
        OUTPUT_DIR / "knoledgr-background-dark-square.jpg",
        OUTPUT_DIR / "knoledgr-background-light-landscape.jpg",
        OUTPUT_DIR / "knoledgr-background-dark-landscape.jpg",
    ]
    canvas = Image.new("RGB", (tile_w * columns, tile_h * 3), COLORS["paper"])
    for index, path in enumerate(files):
        image = Image.open(path).resize((tile_w, tile_h))
        x = (index % columns) * tile_w
        y = (index // columns) * tile_h
        canvas.paste(image, (x, y))
    save_versions(canvas, "knoledgr-background-contact-sheet")


def manifest():
    readme = OUTPUT_DIR / "README.md"
    readme.write_text(
        "\n".join(
            [
                "# Knoledgr Canva Backgrounds",
                "",
                "Reusable branded backplates for Canva and social design work.",
                "",
                "Files:",
                "- `knoledgr-background-light-portrait.(png|jpg)`",
                "- `knoledgr-background-light-square.(png|jpg)`",
                "- `knoledgr-background-light-landscape.(png|jpg)`",
                "- `knoledgr-background-dark-portrait.(png|jpg)`",
                "- `knoledgr-background-dark-square.(png|jpg)`",
                "- `knoledgr-background-dark-landscape.(png|jpg)`",
                "- `knoledgr-background-contact-sheet.(png|jpg)`",
                "",
                "Suggested use:",
                "- Use `light` when the post needs editorial warmth and dark text.",
                "- Use `dark` when the post needs stronger contrast and a more cinematic feel.",
                "- Place the main headline in the calmer open area, not over the orbit art.",
                "",
            ]
        ),
        encoding="utf-8",
    )


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for spec in SPECS:
        width, height = spec["size"]
        if spec["mode"] == "light":
            image = build_light_background(width, height)
        else:
            image = build_dark_background(width, height)
        save_versions(image.convert("RGB"), spec["slug"])
    contact_sheet()
    manifest()
    print(f"Generated Canva backgrounds in: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
