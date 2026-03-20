from pathlib import Path

from PIL import Image, ImageDraw

from generate_sora_upload_images import (
    COLORS,
    SANS_BOLD,
    SANS_REGULAR,
    SERIF_BOLD,
    SERIF_REGULAR,
    brandlogo_art,
    brandmark_art,
    color_with_alpha,
    draw_grid_on,
    f,
    memory_orbit_art,
    rounded_panel,
    text,
)


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_ROOT = ROOT / "public" / "brand" / "social"
INSTAGRAM_DIR = OUTPUT_ROOT / "instagram"
FACEBOOK_DIR = OUTPUT_ROOT / "facebook"

FORMATS = {
    "instagram-square": {
        "size": (1080, 1080),
        "dir": INSTAGRAM_DIR,
        "suffix": "square",
    },
    "instagram-portrait": {
        "size": (1080, 1350),
        "dir": INSTAGRAM_DIR,
        "suffix": "portrait",
    },
    "facebook-landscape": {
        "size": (1200, 630),
        "dir": FACEBOOK_DIR,
        "suffix": "landscape",
    },
}

THEMES = [
    {
        "slug": "brand-memory",
        "eyebrow": "Knoledgr",
        "title": "Decision memory for teams",
        "body": "Search the why behind conversations, decisions, documents, and execution.",
        "chips": ["Decisions", "Knowledge Graph", "Ask Recall"],
        "cta": "knoledgr.com",
        "background": "paper",
        "surface": "brand",
    },
    {
        "slug": "decisions",
        "eyebrow": "Decisions",
        "title": "Decisions stay attached to the work.",
        "body": "Capture rationale, owners, implementation notes, and outcome reviews in one record.",
        "chips": ["Rationale", "Owners", "Impact"],
        "cta": "Rationale - Owners - Impact",
        "background": "night",
        "surface": "decisions",
    },
    {
        "slug": "knowledge-graph",
        "eyebrow": "Knowledge Graph",
        "title": "Recover the thread in seconds.",
        "body": "Knowledge Graph and Ask Recall reconnect the real history behind the work.",
        "chips": ["Graph", "Linked memory"],
        "cta": "Linked memory",
        "background": "night",
        "surface": "knowledge",
    },
    {
        "slug": "ask-recall",
        "eyebrow": "Ask Recall",
        "title": "Grounded answers from team history.",
        "body": "Ask what changed, why it changed, and what still needs attention.",
        "chips": ["Grounded answers", "Team history"],
        "cta": "From team history",
        "background": "paper",
        "surface": "ask",
    },
    {
        "slug": "execution",
        "eyebrow": "Execution",
        "title": "Conversations. Documents. Follow-through.",
        "body": "Sprint flow, blockers, and linked context stay visible in one operating layer.",
        "chips": ["Sprint flow", "Blockers", "Linked context"],
        "cta": "Sprint flow and context",
        "background": "paper",
        "surface": "execution",
    },
]


def new_rgba(width, height, color):
    return Image.new("RGBA", (width, height), color)


def save_versions(image, directory, stem):
    directory.mkdir(parents=True, exist_ok=True)
    png_path = directory / f"{stem}.png"
    jpg_path = directory / f"{stem}.jpg"
    image.save(png_path, format="PNG", optimize=True)
    image.convert("RGB").save(jpg_path, format="JPEG", quality=94, optimize=True)


def text_width(draw, value, font):
    bbox = draw.textbbox((0, 0), value, font=font)
    return bbox[2] - bbox[0]


def multiline_size(draw, value, font, spacing=6):
    bbox = draw.multiline_textbbox((0, 0), value, font=font, spacing=spacing)
    return bbox[2] - bbox[0], bbox[3] - bbox[1]


def wrap_text(draw, value, font, max_width):
    paragraphs = value.split("\n")
    wrapped = []
    for paragraph in paragraphs:
        words = paragraph.split()
        if not words:
            wrapped.append("")
            continue
        line = words[0]
        for word in words[1:]:
            candidate = f"{line} {word}"
            if text_width(draw, candidate, font) <= max_width:
                line = candidate
            else:
                wrapped.append(line)
                line = word
        wrapped.append(line)
    return "\n".join(wrapped)


def clamp_lines(draw, wrapped, font, max_width, max_lines):
    lines = wrapped.split("\n")
    if len(lines) <= max_lines:
        return wrapped
    trimmed = lines[:max_lines]
    while trimmed:
        candidate = trimmed[-1]
        if candidate.endswith("..."):
            break
        if len(candidate) <= 3:
            trimmed[-1] = "..."
            break
        trimmed[-1] = candidate[:-4].rstrip() + "..."
        if text_width(draw, trimmed[-1], font) <= max_width:
            break
    return "\n".join(trimmed)


def fit_text_block(draw, value, font_path, max_size, min_size, max_width, max_lines, spacing=6):
    for size in range(max_size, min_size - 1, -2):
        font = f(font_path, size)
        wrapped = wrap_text(draw, value, font, max_width)
        lines = wrapped.split("\n")
        if len(lines) > max_lines:
            continue
        width, height = multiline_size(draw, wrapped, font, spacing=spacing)
        if width <= max_width:
            return font, wrapped, width, height
    font = f(font_path, min_size)
    wrapped = wrap_text(draw, value, font, max_width)
    wrapped = clamp_lines(draw, wrapped, font, max_width, max_lines)
    width, height = multiline_size(draw, wrapped, font, spacing=spacing)
    return font, wrapped, width, height


def paper_background(width, height):
    base = new_rgba(width, height, COLORS["paper"])
    overlay = new_rgba(width, height, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    draw_grid_on(draw, width, height, step=max(84, width // 11), color=COLORS["linen"], alpha=56)
    draw.ellipse((int(width * 0.58), int(-0.06 * height), int(width * 1.08), int(height * 0.46)), fill=color_with_alpha(COLORS["amber"], 26))
    draw.ellipse((int(-0.16 * width), int(height * 0.56), int(width * 0.42), int(height * 1.08)), fill=color_with_alpha(COLORS["blue"], 18))
    base.alpha_composite(overlay)
    return base


def night_background(width, height):
    base = new_rgba(width, height, COLORS["night"])
    overlay = new_rgba(width, height, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    draw.ellipse((int(-0.14 * width), int(-0.08 * height), int(width * 0.66), int(height * 0.72)), fill=color_with_alpha(COLORS["blue"], 20))
    draw.ellipse((int(width * 0.44), int(height * 0.18), int(width * 1.12), int(height * 1.02)), fill=color_with_alpha(COLORS["amber"], 16))
    draw.ellipse((int(width * 0.26), int(height * 0.14), int(width * 0.84), int(height * 0.76)), outline=color_with_alpha(COLORS["blue"], 80), width=2)
    draw.ellipse((int(width * 0.34), int(height * 0.24), int(width * 0.76), int(height * 0.64)), outline=color_with_alpha(COLORS["blue"], 44), width=2)
    base.alpha_composite(overlay)
    return base


def category_for_size(width, height):
    if width > height:
        return "landscape"
    if width == height:
        return "square"
    return "portrait"


def metrics(width, height):
    category = category_for_size(width, height)
    margin = int(width * 0.07 if category == "landscape" else width * 0.08)
    gap = int(height * 0.035)
    mark_size = max(72, int(min(width, height) * (0.11 if category == "portrait" else 0.09)))
    content_width = width - margin * 2
    cta_height = max(52, int(height * (0.075 if category == "landscape" else 0.065)))
    return {
        "category": category,
        "margin": margin,
        "gap": gap,
        "mark_size": mark_size,
        "content_width": content_width,
        "cta_height": cta_height,
    }


def draw_brand_header(base, width, height, layout, light=False):
    draw = ImageDraw.Draw(base)
    margin = layout["margin"]
    mark = brandmark_art(size=layout["mark_size"])
    y = margin
    base.alpha_composite(mark, (margin, y))
    fill = COLORS["paper"] if light else COLORS["ink"]
    label_size = max(28, int(layout["mark_size"] * 0.55))
    text(draw, (margin + layout["mark_size"] + 18, y + layout["mark_size"] // 2 + 2), "Knoledgr", f(SANS_BOLD, label_size), fill, anchor="lm")
    return y + layout["mark_size"]


def draw_chip_row(draw, x, y, max_width, labels, dark=False, chip_height=46, gap=10):
    cursor_x = x
    cursor_y = y
    max_x = x + max_width
    font = f(SANS_BOLD, max(16, int(chip_height * 0.38)))
    fill = COLORS["panel_dark"] if not dark else COLORS["card"]
    outline = COLORS["linen"] if not dark else "#384257"
    text_fill = COLORS["paper"] if not dark else COLORS["ink"]
    for label in labels:
        width = text_width(draw, label, font) + int(chip_height * 1.15)
        if cursor_x + width > max_x and cursor_x != x:
            cursor_x = x
            cursor_y += chip_height + gap
        rounded_panel(draw, (cursor_x, cursor_y, cursor_x + width, cursor_y + chip_height), int(chip_height * 0.38), fill, outline=outline)
        text(draw, (cursor_x + width // 2, cursor_y + chip_height // 2 + 1), label, font, text_fill, anchor="mm")
        cursor_x += width + gap
    return cursor_y + chip_height


def draw_cta(draw, layout, width, height, label, dark=False):
    font = f(SANS_BOLD, max(18, int(layout["cta_height"] * 0.35)))
    pill_width = min(layout["content_width"], text_width(draw, label, font) + int(layout["cta_height"] * 1.4))
    x1 = layout["margin"]
    y1 = height - layout["margin"] - layout["cta_height"]
    fill = COLORS["panel_dark"] if not dark else COLORS["card"]
    outline = COLORS["linen"] if not dark else "#384257"
    text_fill = COLORS["paper"] if not dark else COLORS["ink"]
    rounded_panel(draw, (x1, y1, x1 + pill_width, y1 + layout["cta_height"]), int(layout["cta_height"] * 0.38), fill, outline=outline)
    text(draw, (x1 + pill_width // 2, y1 + layout["cta_height"] // 2 + 1), label, font, text_fill, anchor="mm")
    return y1


def draw_brand_surface(base, draw, x, y, w, h):
    rounded_panel(draw, (x, y, x + w, y + h), int(min(w, h) * 0.08), COLORS["panel_dark"], outline="#3B322B")
    orbit = memory_orbit_art(width=max(320, int(w * 0.82)), height=max(180, int(h * 0.52)))
    base.alpha_composite(orbit, (x + (w - orbit.width) // 2, y + int(h * 0.12)))
    draw = ImageDraw.Draw(base)
    logo = brandlogo_art(width=max(240, int(w * 0.46)), height=max(68, int(h * 0.18)))
    base.alpha_composite(logo, (x + int(w * 0.08), y + int(h * 0.08)))
    draw = ImageDraw.Draw(base)
    if h >= 260:
        card_y = y + int(h * 0.7)
        card_h = int(h * 0.16)
        gap = int(w * 0.04)
        card_w = int((w - gap * 3) / 2)
        note_card(draw, x + gap, card_y, card_w, card_h, "SEARCHABLE", "Context stays reusable after meetings, reviews, and releases.", color_with_alpha(COLORS["paper"], 28), color_with_alpha(COLORS["paper"], 34), title_fill=COLORS["muted_dark"], body_fill=COLORS["paper"])
        note_card(draw, x + gap * 2 + card_w, card_y, card_w, card_h, "CALM SIGNAL", "Blue for memory, amber for review and risk.", color_with_alpha(COLORS["blue"], 24), color_with_alpha(COLORS["blue"], 40), title_fill=COLORS["muted_dark"], body_fill=COLORS["paper"])


def draw_tiles(draw, x, y, w, h, tiles, wide_threshold=560):
    columns = 3 if w >= wide_threshold else 1
    gap = max(14, int(w * 0.03))
    rows = (len(tiles) + columns - 1) // columns
    tile_width = int((w - gap * (columns - 1)) / columns)
    tile_height = int((h - gap * (rows - 1)) / rows)
    for index, (label, value, fill, outline) in enumerate(tiles):
        row = index // columns
        column = index % columns
        tx = x + column * (tile_width + gap)
        ty = y + row * (tile_height + gap)
        rounded_panel(draw, (tx, ty, tx + tile_width, ty + tile_height), int(tile_height * 0.16), fill, outline=outline)
        text(draw, (tx + int(tile_width * 0.08), ty + int(tile_height * 0.2)), label, f(SANS_BOLD, max(14, int(tile_height * 0.12))), COLORS["muted"])
        body_font, wrapped, _, _ = fit_text_block(draw, value, SANS_REGULAR, max(24, int(tile_height * 0.24)), 16, int(tile_width * 0.82), 3, spacing=4)
        draw.multiline_text((tx + int(tile_width * 0.08), ty + int(tile_height * 0.42)), wrapped, font=body_font, fill=COLORS["ink"], spacing=4)


def note_card(draw, x, y, w, h, label, value, fill, outline, title_fill=None, body_fill=None):
    rounded_panel(draw, (x, y, x + w, y + h), int(h * 0.18), fill, outline=outline)
    title_fill = title_fill or COLORS["muted"]
    body_fill = body_fill or COLORS["ink"]
    text(draw, (x + int(w * 0.08), y + int(h * 0.24)), label, f(SANS_BOLD, max(14, int(h * 0.14))), title_fill)
    body_font, wrapped, _, _ = fit_text_block(draw, value, SANS_REGULAR, max(24, int(h * 0.24)), 14, int(w * 0.82), 3, spacing=4)
    draw.multiline_text((x + int(w * 0.08), y + int(h * 0.48)), wrapped, font=body_font, fill=body_fill, spacing=4)


def draw_decisions_surface(base, draw, x, y, w, h):
    rounded_panel(draw, (x, y, x + w, y + h), int(min(w, h) * 0.08), COLORS["card"], outline=COLORS["linen"])
    pad = int(w * 0.08)
    text(draw, (x + pad, y + int(h * 0.12)), "DECISION RECORD", f(SANS_BOLD, max(16, int(h * 0.05))), COLORS["muted"])
    title_font, wrapped_title, _, _ = fit_text_block(draw, "Pricing review approved", SERIF_BOLD, max(40, int(h * 0.12)), 24, int(w * 0.78), 2, spacing=2)
    draw.multiline_text((x + pad, y + int(h * 0.23)), wrapped_title, font=title_font, fill=COLORS["ink"], spacing=2)
    body_font, wrapped_body, _, _ = fit_text_block(draw, "Rationale, owners, and impact stay attached.", SANS_REGULAR, max(24, int(h * 0.07)), 18, int(w * 0.78), 2, spacing=4)
    draw.multiline_text((x + pad, y + int(h * 0.4)), wrapped_body, font=body_font, fill=COLORS["muted"], spacing=4)
    tiles = [
        ("RATIONALE", "Rollout risk requires alignment", COLORS["blue_soft"], COLORS["blue"]),
        ("OWNERS", "Product and Security", COLORS["card"], COLORS["linen"]),
        ("IMPACT", "Launch moved by 2 days", COLORS["amber_soft"], COLORS["amber"]),
    ]
    tiles_y = y + int(h * 0.58)
    tiles_h = int(h * 0.22 if w >= 560 else h * 0.28)
    draw_tiles(draw, x + pad, tiles_y, w - pad * 2, tiles_h, tiles)
    if w >= 560 and h >= 280:
        rail_y = tiles_y + tiles_h + int(h * 0.04)
        rail_h = int(h * 0.12)
        note_card(draw, x + pad, rail_y, w - pad * 2, rail_h, "LINKED CONTEXT", "Conversation, security review, sprint, and rollout notes remain attached.", COLORS["card"], COLORS["linen"])


def draw_knowledge_surface(base, draw, x, y, w, h):
    rounded_panel(draw, (x, y, x + w, y + h), int(min(w, h) * 0.08), COLORS["card"], outline=COLORS["linen"])
    orbit_height = int(h * 0.46 if h >= 320 else h * 0.4)
    orbit = memory_orbit_art(width=max(320, int(w * 0.86)), height=max(180, orbit_height))
    base.alpha_composite(orbit, (x + (w - orbit.width) // 2, y + int(h * 0.06)))
    draw = ImageDraw.Draw(base)
    answer_y = y + int(h * 0.58)
    answer_h = int(h * 0.16)
    rounded_panel(draw, (x + int(w * 0.08), answer_y, x + int(w * 0.92), answer_y + answer_h), int(h * 0.07), COLORS["blue_soft"], outline=COLORS["blue"])
    text(draw, (x + int(w * 0.14), answer_y + int(answer_h * 0.28)), "ASK RECALL", f(SANS_BOLD, max(15, int(answer_h * 0.16))), COLORS["muted"])
    body_font, wrapped, _, _ = fit_text_block(draw, "What changed in the pricing rollout and why?", SANS_REGULAR, max(24, int(answer_h * 0.3)), 15, int(w * 0.68), 2, spacing=4)
    draw.multiline_text((x + int(w * 0.14), answer_y + int(answer_h * 0.54)), wrapped, font=body_font, fill=COLORS["ink"], spacing=4)
    if h >= 280:
        chips_y = answer_y + answer_h + int(h * 0.04)
        draw_chip_row(draw, x + int(w * 0.08), chips_y, int(w * 0.84), ["Graph", "Decision", "Meeting"], dark=True, chip_height=max(38, int(h * 0.08)), gap=8)


def draw_ask_surface(base, draw, x, y, w, h):
    rounded_panel(draw, (x, y, x + w, y + h), int(min(w, h) * 0.08), COLORS["card"], outline=COLORS["linen"])
    prompt_y = y + int(h * 0.08)
    rounded_panel(draw, (x + int(w * 0.08), prompt_y, x + int(w * 0.92), prompt_y + int(h * 0.22)), int(h * 0.07), COLORS["panel_dark"], outline="#384257")
    text(draw, (x + int(w * 0.14), prompt_y + int(h * 0.07)), "ASK RECALL", f(SANS_BOLD, max(16, int(h * 0.05))), COLORS["muted_dark"])
    prompt_font, wrapped_prompt, _, _ = fit_text_block(draw, "What changed in the pricing rollout and why?", SANS_REGULAR, max(24, int(h * 0.09)), 16, int(w * 0.68), 2, spacing=4)
    draw.multiline_text((x + int(w * 0.14), prompt_y + int(h * 0.13)), wrapped_prompt, font=prompt_font, fill=COLORS["paper"], spacing=4)

    answer_y = y + int(h * 0.38)
    answer_h = int(h * 0.28 if h >= 320 else h * 0.24)
    rounded_panel(draw, (x + int(w * 0.08), answer_y, x + int(w * 0.92), answer_y + answer_h), int(h * 0.07), COLORS["blue_soft"], outline=COLORS["blue"])
    text(draw, (x + int(w * 0.14), answer_y + int(answer_h * 0.18)), "GROUNDED ANSWER", f(SANS_BOLD, max(16, int(answer_h * 0.14))), COLORS["muted"])
    answer_font, wrapped_answer, _, _ = fit_text_block(draw, "Security review changed the rollout plan. The linked decision record captured why.", SERIF_BOLD, max(28, int(answer_h * 0.26)), 18, int(w * 0.68), 3, spacing=4)
    draw.multiline_text((x + int(w * 0.14), answer_y + int(answer_h * 0.38)), wrapped_answer, font=answer_font, fill=COLORS["ink"], spacing=4)

    chips_y = answer_y + answer_h + int(h * 0.04)
    draw_chip_row(draw, x + int(w * 0.08), chips_y, int(w * 0.84), ["Decision", "Meeting", "Sprint"], dark=True, chip_height=max(40, int(h * 0.1)), gap=8)


def draw_execution_surface(base, draw, x, y, w, h):
    rounded_panel(draw, (x, y, x + w, y + h), int(min(w, h) * 0.08), COLORS["card"], outline=COLORS["linen"])
    pad = int(w * 0.08)
    text(draw, (x + pad, y + int(h * 0.1)), "SPRINT FLOW", f(SANS_BOLD, max(16, int(h * 0.05))), COLORS["muted"])
    stage_y = y + int(h * 0.18)
    stage_h = int(h * 0.34)
    if w >= 520:
        gap = int(w * 0.04)
        col_w = int((w - pad * 2 - gap * 2) / 3)
        labels = ["Todo", "Doing", "Done"]
        for index, label in enumerate(labels):
            sx = x + pad + index * (col_w + gap)
            rounded_panel(draw, (sx, stage_y, sx + col_w, stage_y + stage_h), int(stage_h * 0.09), "#F1E9DD", outline=COLORS["linen"])
            text(draw, (sx + int(col_w * 0.16), stage_y + int(stage_h * 0.14)), label, f(SANS_BOLD, max(16, int(stage_h * 0.1))), COLORS["ink"])
            card_y = stage_y + int(stage_h * 0.34)
            card_h = int(stage_h * 0.16)
            for offset in range(2 if label == "Doing" else 1):
                outline = COLORS["blue"] if label == "Doing" and offset == 0 else COLORS["amber"] if label == "Doing" else COLORS["linen"]
                rounded_panel(draw, (sx + int(col_w * 0.12), card_y + offset * int(stage_h * 0.22), sx + int(col_w * 0.88), card_y + offset * int(stage_h * 0.22) + card_h), int(card_h * 0.28), COLORS["white"], outline=outline)
    else:
        tiles = [
            ("TODO", "3 planned issues", COLORS["card"], COLORS["linen"]),
            ("DOING", "Security review is active", COLORS["blue_soft"], COLORS["blue"]),
            ("DONE", "2 items shipped", COLORS["amber_soft"], COLORS["amber"]),
        ]
        draw_tiles(draw, x + pad, stage_y, w - pad * 2, stage_h, tiles, wide_threshold=9999)

    signal_y = y + int(h * 0.62)
    signal_h = int(h * 0.18)
    rounded_panel(draw, (x + pad, signal_y, x + w - pad, signal_y + signal_h), int(h * 0.06), COLORS["panel_dark"], outline="#3B322B")
    text(draw, (x + pad + int(w * 0.05), signal_y + int(signal_h * 0.28)), "BLOCKER SIGNAL", f(SANS_BOLD, max(16, int(signal_h * 0.2))), COLORS["muted_dark"])
    body_font, wrapped_body, _, _ = fit_text_block(draw, "Security review delaying rollout", SERIF_BOLD, max(30, int(signal_h * 0.38)), 18, int(w * 0.62), 2, spacing=2)
    draw.multiline_text((x + pad + int(w * 0.05), signal_y + int(signal_h * 0.54)), wrapped_body, font=body_font, fill=COLORS["paper"], spacing=2)
    if h >= 320:
        note_card(draw, x + pad, y + int(h * 0.84), w - pad * 2, int(h * 0.1), "LINKED CONTEXT", "Decision review, security annex, and sprint board stay in sync.", COLORS["card"], COLORS["linen"])


SURFACE_RENDERERS = {
    "brand": draw_brand_surface,
    "decisions": draw_decisions_surface,
    "knowledge": draw_knowledge_surface,
    "ask": draw_ask_surface,
    "execution": draw_execution_surface,
}


def draw_surface(base, draw, theme, layout, width, height, text_block_bottom, cta_top):
    if layout["category"] == "landscape":
        surface_w = int(layout["content_width"] * 0.4)
        surface_x = width - layout["margin"] - surface_w
        surface_h = int(height * 0.7)
        surface_y = max(layout["margin"] + int(height * 0.08), (height - surface_h) // 2)
    else:
        surface_x = layout["margin"]
        surface_w = layout["content_width"]
        surface_y = max(text_block_bottom + layout["gap"], int(height * (0.55 if layout["category"] == "square" else 0.5)))
        surface_h = cta_top - layout["gap"] - surface_y
    surface_h = max(int(height * 0.22), surface_h)
    SURFACE_RENDERERS[theme["surface"]](base, draw, surface_x, surface_y, surface_w, surface_h)


def render_theme(theme, format_key):
    format_info = FORMATS[format_key]
    width, height = format_info["size"]
    layout = metrics(width, height)
    category = layout["category"]

    if theme["background"] == "night":
        base = night_background(width, height)
        text_fill = COLORS["paper"]
        body_fill = COLORS["muted_dark"]
        header_light = True
        dark_cta = True
    else:
        base = paper_background(width, height)
        text_fill = COLORS["ink"]
        body_fill = COLORS["muted"]
        header_light = False
        dark_cta = False

    draw = ImageDraw.Draw(base)
    header_bottom = draw_brand_header(base, width, height, layout, light=header_light)

    if category == "landscape":
        text_width_limit = int(layout["content_width"] * 0.42)
    elif category == "square":
        text_width_limit = int(layout["content_width"] * 0.84)
    else:
        text_width_limit = int(layout["content_width"] * 0.88)

    eyebrow_y = header_bottom + layout["gap"]
    eyebrow_font = f(SERIF_REGULAR, max(20, int(min(width, height) * 0.03)))
    text(draw, (layout["margin"], eyebrow_y), theme["eyebrow"].upper(), eyebrow_font, body_fill)

    title_y = eyebrow_y + int(height * 0.06)
    title_font, wrapped_title, _, title_height = fit_text_block(
        draw,
        theme["title"],
        SERIF_BOLD,
        {"landscape": 72, "square": 86, "portrait": 90}[category],
        34,
        text_width_limit,
        3 if category != "landscape" else 2,
        spacing=4,
    )
    draw.multiline_text((layout["margin"], title_y), wrapped_title, font=title_font, fill=text_fill, spacing=4)

    body_y = title_y + title_height + layout["gap"]
    body_font, wrapped_body, _, body_height = fit_text_block(
        draw,
        theme["body"],
        SANS_REGULAR,
        {"landscape": 28, "square": 26, "portrait": 28}[category],
        18,
        text_width_limit,
        3,
        spacing=6,
    )
    draw.multiline_text((layout["margin"], body_y), wrapped_body, font=body_font, fill=body_fill, spacing=6)

    chip_height = max(42, int(height * (0.06 if category == "landscape" else 0.05)))
    chips_y = body_y + body_height + layout["gap"]
    chips_bottom = draw_chip_row(draw, layout["margin"], chips_y, text_width_limit, theme["chips"], dark=header_light, chip_height=chip_height, gap=10)

    cta_top = draw_cta(draw, layout, width, height, theme["cta"], dark=dark_cta)
    draw_surface(base, draw, theme, layout, width, height, chips_bottom, cta_top)

    filename = f"{theme['slug']}-{format_info['suffix']}"
    save_versions(base.convert("RGB"), format_info["dir"], filename)
    return filename


def contact_sheet(directory, output_name, items, tile_width, tile_height, columns):
    rows = (len(items) + columns - 1) // columns
    canvas = Image.new("RGB", (tile_width * columns, tile_height * rows), COLORS["paper"])
    for index, name in enumerate(items):
        image = Image.open(directory / f"{name}.jpg").resize((tile_width, tile_height))
        x = (index % columns) * tile_width
        y = (index // columns) * tile_height
        canvas.paste(image, (x, y))
    save_versions(canvas, directory, output_name)


def write_readme(outputs):
    readme = OUTPUT_ROOT / "README.md"
    instagram_square = [name for name in outputs["instagram"] if name.endswith("square")]
    instagram_portrait = [name for name in outputs["instagram"] if name.endswith("portrait")]
    facebook_landscape = outputs["facebook"]
    readme.write_text(
        "\n".join(
            [
                "# Knoledgr Social Post Pack",
                "",
                "Platform-native social images generated from the Knoledgr brand system.",
                "",
                "Folders:",
                "- `instagram/`: square and portrait feed assets",
                "- `facebook/`: landscape feed assets",
                "",
                "Instagram square exports:",
                *[f"- `{name}.(png|jpg)`" for name in instagram_square],
                "",
                "Instagram portrait exports:",
                *[f"- `{name}.(png|jpg)`" for name in instagram_portrait],
                "",
                "Facebook landscape exports:",
                *[f"- `{name}.(png|jpg)`" for name in facebook_landscape],
                "",
                "Suggested posting order:",
                "1. `brand-memory`",
                "2. `decisions`",
                "3. `knowledge-graph`",
                "4. `ask-recall`",
                "5. `execution`",
                "",
                "Use these with the campaign language in `../video/KNOLEDGR_VIDEO_CAMPAIGN.md`.",
                "",
            ]
        ),
        encoding="utf-8",
    )


def main():
    outputs = {"instagram": [], "facebook": []}
    for theme in THEMES:
        for format_key, format_info in FORMATS.items():
            filename = render_theme(theme, format_key)
            if format_info["dir"] == INSTAGRAM_DIR:
                outputs["instagram"].append(filename)
            else:
                outputs["facebook"].append(filename)

    contact_sheet(
        INSTAGRAM_DIR,
        "instagram-square-contact-sheet",
        [name for name in outputs["instagram"] if name.endswith("square")],
        540,
        540,
        2,
    )
    contact_sheet(
        INSTAGRAM_DIR,
        "instagram-portrait-contact-sheet",
        [name for name in outputs["instagram"] if name.endswith("portrait")],
        540,
        675,
        2,
    )
    contact_sheet(
        FACEBOOK_DIR,
        "facebook-landscape-contact-sheet",
        outputs["facebook"],
        600,
        315,
        2,
    )
    write_readme(outputs)
    print(f"Generated social post pack in: {OUTPUT_ROOT}")


if __name__ == "__main__":
    main()
