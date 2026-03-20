from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "public" / "brand" / "video" / "sora" / "uploads"
WIDTH = 1920
HEIGHT = 1080
PORTRAIT_WIDTH = 1080
PORTRAIT_HEIGHT = 1920

COLORS = {
    "ink": "#171513",
    "night": "#172233",
    "paper": "#F8F2E8",
    "linen": "#E9DBC7",
    "card": "#FFFCF8",
    "muted": "#6E655B",
    "muted_dark": "#B7AB9B",
    "blue": "#7EB7FF",
    "blue_soft": "#D9E9FF",
    "amber": "#D9A25E",
    "amber_soft": "#F6E4C8",
    "white": "#FFFFFF",
    "panel_dark": "#1D1815",
}


def font_path(name):
    return Path("C:/Windows/Fonts") / name


SERIF_BOLD = str(font_path("georgiab.ttf"))
SERIF_REGULAR = str(font_path("georgia.ttf"))
SANS_BOLD = str(font_path("arialbd.ttf"))
SANS_REGULAR = str(font_path("arial.ttf"))


def f(path, size):
    return ImageFont.truetype(path, size=size)


def base_image(color):
    return Image.new("RGB", (WIDTH, HEIGHT), color)


def draw_grid(draw, step=120, color="#E9DBC7", alpha=35):
    line_color = color_with_alpha(color, alpha)
    for x in range(0, WIDTH, step):
        draw.line((x, 0, x, HEIGHT), fill=line_color, width=1)
    for y in range(0, HEIGHT, step):
        draw.line((0, y, WIDTH, y), fill=line_color, width=1)


def color_with_alpha(hex_color, alpha):
    hex_color = hex_color.lstrip("#")
    r = int(hex_color[0:2], 16)
    g = int(hex_color[2:4], 16)
    b = int(hex_color[4:6], 16)
    return (r, g, b, alpha)


def rgba_canvas():
    return Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))


def rounded_panel(draw, xy, radius, fill, outline=None, width=2):
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)


def text(draw, xy, value, font, fill, anchor="la"):
    draw.text(xy, value, font=font, fill=fill, anchor=anchor)


def save_versions(image, name):
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    png_path = OUTPUT_DIR / f"{name}.png"
    jpg_path = OUTPUT_DIR / f"{name}.jpg"
    image.save(png_path, format="PNG", optimize=True)
    image.convert("RGB").save(jpg_path, format="JPEG", quality=94, optimize=True)


def sized_rgba_canvas(width, height):
    return Image.new("RGBA", (width, height), (0, 0, 0, 0))


def draw_grid_on(draw, width, height, step=120, color="#E9DBC7", alpha=35):
    line_color = color_with_alpha(color, alpha)
    for x in range(0, width, step):
        draw.line((x, 0, x, height), fill=line_color, width=1)
    for y in range(0, height, step):
        draw.line((0, y, width, y), fill=line_color, width=1)


def brandmark_art(size=320):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    scale = size / 48

    def sx(value):
        return int(round(value * scale))

    def point(x, y):
        return (sx(x), sx(y))

    draw.rounded_rectangle(
        (sx(4), sx(4), sx(44), sx(44)),
        radius=sx(15),
        fill="#162131",
        outline=color_with_alpha("#F6ECDB", 36),
        width=max(1, sx(1.2)),
    )
    draw.ellipse((sx(20), 0, size + sx(6), sx(28)), fill=color_with_alpha(COLORS["blue"], 70))
    draw.ellipse((0, sx(20), sx(30), size + sx(6)), fill=color_with_alpha(COLORS["amber"], 54))
    draw.line([point(12.5, 17.2), point(17.1, 12.7), point(22.5, 11.6), point(30.2, 13.8)], fill=color_with_alpha(COLORS["blue"], 72), width=max(1, sx(1.4)))
    draw.line([point(20.8, 24), point(25.6, 25.9), point(29.1, 29.5), point(31.5, 34.9)], fill=color_with_alpha(COLORS["amber"], 60), width=max(1, sx(1.4)))
    draw.line([point(16.5, 12.5), point(16.5, 35.5)], fill="#F7EFE4", width=max(2, sx(4.6)))
    draw.line([point(30.5, 13.5), point(20.8, 24), point(31.5, 35)], fill="#F7EFE4", width=max(2, sx(4.6)), joint="curve")
    draw.line([point(20.8, 24), point(26, 24)], fill=COLORS["blue"], width=max(2, sx(3.3)))
    for x, y, radius, fill in [
        (30.5, 13.5, 3.4, COLORS["blue"]),
        (20.8, 24, 3.4, "#F7EFE4"),
        (31.5, 35, 3.4, COLORS["amber"]),
    ]:
        cx, cy = point(x, y)
        rr = sx(radius)
        draw.ellipse((cx - rr, cy - rr, cx + rr, cy + rr), fill=fill)
    return img


def brandlogo_art(width=980, height=220):
    img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    mark = brandmark_art(size=150)
    y = (height - mark.height) // 2
    img.alpha_composite(mark, (24, y))
    draw = ImageDraw.Draw(img)
    text(draw, (210, height // 2 + 8), "Knoledgr", f(SANS_BOLD, 118), COLORS["ink"], anchor="lm")
    return img


def memory_orbit_art(width=860, height=560):
    img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle((24, 24, width - 24, height - 24), radius=44, fill="#F3E8D7", outline=color_with_alpha(COLORS["ink"], 22), width=2)
    draw.ellipse((430, 26, 760, 338), fill=color_with_alpha(COLORS["blue"], 48))
    draw.ellipse((60, 20, 430, 390), fill=color_with_alpha(COLORS["amber"], 42))
    node_lines = [
        ((122, 374), (438, 246), (724, 370), color_with_alpha(COLORS["ink"], 36)),
        ((188, 188), (406, 148), (588, 282), color_with_alpha(COLORS["blue"], 80)),
        ((336, 402), (510, 344), (614, 372), color_with_alpha(COLORS["amber"], 72)),
    ]
    for start, mid, end, fill in node_lines:
        draw.line([start, mid, end], fill=fill, width=4)
    for cx, cy, radius, fill, inner in [
        (188, 188, 22, "#203049", "#F7EFE4"),
        (322, 142, 16, COLORS["blue"], None),
        (436, 248, 24, COLORS["night"], "#F7EFE4"),
        (614, 372, 18, COLORS["amber"], None),
        (724, 370, 14, COLORS["blue"], None),
        (336, 402, 14, COLORS["night"], None),
        (588, 282, 14, COLORS["amber"], None),
    ]:
        draw.ellipse((cx - radius, cy - radius, cx + radius, cy + radius), fill=fill)
        if inner:
            inner_r = max(6, radius // 2)
            draw.ellipse((cx - inner_r, cy - inner_r, cx + inner_r, cy + inner_r), fill=inner)
    for x, y, w, fill, outline in [
        (112, 438, 194, color_with_alpha(COLORS["night"], 16), color_with_alpha(COLORS["night"], 22)),
        (332, 438, 196, color_with_alpha(COLORS["blue"], 24), color_with_alpha(COLORS["blue"], 34)),
        (552, 438, 196, color_with_alpha(COLORS["amber"], 24), color_with_alpha(COLORS["amber"], 34)),
    ]:
        draw.rounded_rectangle((x, y, x + w, y + 48), radius=16, fill=fill, outline=outline, width=2)
    return img


def aurora_reference_art():
    base = base_image(COLORS["night"]).convert("RGBA")
    overlay = rgba_canvas()
    draw = ImageDraw.Draw(overlay)
    draw.ellipse((-140, -160, 980, 760), fill=color_with_alpha(COLORS["blue"], 42))
    draw.ellipse((840, -80, 1920, 860), fill=color_with_alpha(COLORS["amber"], 28))
    draw.ellipse((340, 220, 1660, 1180), fill=color_with_alpha(COLORS["paper"], 16))
    draw.line((240, 220, 860, 520), fill=color_with_alpha(COLORS["blue"], 70), width=4)
    draw.line((1420, 250, 1030, 470), fill=color_with_alpha(COLORS["blue"], 56), width=4)
    draw.line((420, 830, 840, 620), fill=color_with_alpha(COLORS["blue"], 56), width=4)
    draw.line((1520, 820, 1080, 620), fill=color_with_alpha(COLORS["blue"], 56), width=4)
    base.alpha_composite(overlay)
    return base


def generate_reference_assets():
    brandmark = Image.new("RGBA", (1200, 1200), COLORS["paper"])
    brandmark.alpha_composite(brandmark_art(size=620), ((1200 - 620) // 2, (1200 - 620) // 2))
    save_versions(brandmark.convert("RGB"), "knoledgr-brandmark-reference")

    brandlogo = Image.new("RGBA", (1600, 500), COLORS["paper"])
    brandlogo.alpha_composite(brandlogo_art(width=1120, height=240), ((1600 - 1120) // 2, 130))
    save_versions(brandlogo.convert("RGB"), "knoledgr-brandlogo-reference")

    orbit = memory_orbit_art(width=1280, height=820)
    save_versions(orbit.convert("RGB"), "knoledgr-memory-orbit-reference")

    aurora = aurora_reference_art()
    save_versions(aurora.convert("RGB"), "knoledgr-aurora-reference")


def scene_01():
    base = base_image(COLORS["paper"]).convert("RGBA")
    overlay = rgba_canvas()
    draw = ImageDraw.Draw(overlay)
    draw_grid(draw, step=110, color=COLORS["linen"], alpha=90)
    draw.ellipse((1280, -40, 1840, 520), fill=color_with_alpha(COLORS["amber"], 22))
    draw.ellipse((80, 620, 760, 1280), fill=color_with_alpha(COLORS["blue"], 18))
    base.alpha_composite(overlay)
    draw = ImageDraw.Draw(base)

    text(draw, (140, 160), "SHOT 01", f(SERIF_REGULAR, 24), COLORS["muted"])
    text(draw, (140, 265), "Work moves fast.", f(SERIF_BOLD, 84), COLORS["ink"])
    text(draw, (140, 350), "Context disappears even faster.", f(SERIF_BOLD, 72), COLORS["ink"])

    cards = [
        ((150, 470, 408, 598), "Decision", "Pricing review approved"),
        ((500, 640, 770, 768), "Meeting Note", "Rollout risks need alignment"),
        ((868, 400, 1122, 528), "Issue Update", "Sprint slipped by two days"),
        ((1258, 614, 1478, 742), "Document", "Security annex draft"),
        ((1634, 454, 1784, 582), "Ask", "What changed?"),
    ]
    for box, title, subtitle in cards:
        rounded_panel(draw, box, 26, COLORS["card"], outline=COLORS["linen"])
        x1, y1, x2, y2 = box
        text(draw, (x1 + 34, y1 + 42), title, f(SANS_BOLD, 22), COLORS["ink"])
        text(draw, (x1 + 34, y1 + 78), subtitle, f(SANS_REGULAR, 18), COLORS["muted"])

    save_versions(base.convert("RGB"), "scene-01-problem")


def scene_02():
    base = base_image(COLORS["night"]).convert("RGBA")
    overlay = rgba_canvas()
    draw = ImageDraw.Draw(overlay)
    draw.ellipse((220, 80, 980, 840), fill=color_with_alpha(COLORS["blue"], 18))
    draw.ellipse((1120, 120, 1860, 860), fill=color_with_alpha(COLORS["amber"], 16))
    draw.ellipse((520, 100, 1400, 980), outline=color_with_alpha(COLORS["blue"], 120), width=3)
    draw.ellipse((660, 240, 1260, 840), outline=color_with_alpha(COLORS["blue"], 70), width=2)
    line_points = [
        ((412, 278), (764, 458)),
        ((1430, 308), (1100, 470)),
        ((510, 806), (820, 610)),
        ((1448, 776), (1100, 610)),
    ]
    for start, end in line_points:
        draw.line((*start, *end), fill=color_with_alpha(COLORS["blue"], 160), width=4)
    for cx, cy, tone in [
        (318, 226, COLORS["amber"]),
        (1556, 256, COLORS["blue"]),
        (418, 760, COLORS["blue"]),
        (1546, 744, COLORS["amber"]),
    ]:
        draw.ellipse((cx - 12, cy - 12, cx + 12, cy + 12), fill=tone)
    base.alpha_composite(overlay)
    draw = ImageDraw.Draw(base)

    text(draw, (140, 160), "SHOT 02", f(SERIF_REGULAR, 24), COLORS["muted_dark"])
    text(draw, (140, 236), "Search the why", f(SERIF_BOLD, 76), COLORS["paper"])
    text(draw, (140, 318), "behind the work.", f(SERIF_BOLD, 76), COLORS["paper"])
    text(draw, (140, 388), "Memory lines reconnect the record.", f(SANS_REGULAR, 28), COLORS["muted_dark"])
    mark = brandmark_art(size=280)
    base.alpha_composite(mark, ((WIDTH - mark.width) // 2, (HEIGHT - mark.height) // 2 + 10))
    save_versions(base.convert("RGB"), "scene-02-brand-emergence")


def scene_03():
    base = base_image(COLORS["ink"]).convert("RGBA")
    draw = ImageDraw.Draw(base)
    rounded_panel(draw, (124, 110, 1796, 970), 40, COLORS["panel_dark"], outline="#3B322B")
    rounded_panel(draw, (190, 172, 1470, 892), 30, "#25201C", outline="#3B322B")
    draw.rectangle((250, 240, 1410, 280), fill="#322B26")
    rounded_panel(draw, (1010, 210, 1640, 386), 28, COLORS["card"], outline=COLORS["linen"])
    text(draw, (1052, 262), "DECISION RECORD", f(SANS_BOLD, 18), COLORS["muted"])
    text(draw, (1052, 320), "Pricing review approved", f(SERIF_BOLD, 44), COLORS["ink"])
    text(draw, (1052, 362), "Rationale, owners, and downstream impact stay attached.", f(SANS_REGULAR, 22), COLORS["muted"])
    rounded_panel(draw, (1010, 420, 1296, 592), 24, "#222631", outline="#384257")
    text(draw, (1048, 468), "RATIONALE", f(SANS_BOLD, 17), COLORS["muted_dark"])
    text(draw, (1048, 516), "Price change aligns to rollout risk", f(SANS_REGULAR, 22), COLORS["paper"])
    rounded_panel(draw, (1324, 420, 1640, 592), 24, "#221D19", outline="#3B322B")
    text(draw, (1362, 468), "LINKED CONTEXT", f(SANS_BOLD, 17), COLORS["muted_dark"])
    text(draw, (1362, 516), "Conversation, security review, sprint", f(SANS_REGULAR, 22), COLORS["paper"])
    rounded_panel(draw, (1010, 626, 1640, 810), 28, "#1B263A", outline="#34517A")
    text(draw, (1052, 674), "ON-SCREEN COPY", f(SANS_BOLD, 17), "#C8D8FF")
    text(draw, (1052, 734), "Decisions stay attached", f(SERIF_BOLD, 56), COLORS["paper"])
    text(draw, (1052, 796), "to the work.", f(SERIF_BOLD, 56), COLORS["paper"])
    text(draw, (140, 130), "SHOT 03", f(SERIF_REGULAR, 24), COLORS["muted_dark"])
    save_versions(base.convert("RGB"), "scene-03-decisions")


def scene_04():
    base = base_image(COLORS["night"]).convert("RGBA")
    overlay = rgba_canvas()
    draw = ImageDraw.Draw(overlay)
    for r, alpha in [(180, 110), (300, 70)]:
        draw.ellipse((1270 - r, 520 - r, 1270 + r, 520 + r), outline=color_with_alpha(COLORS["blue"], alpha), width=3)
    nodes = [
        (1120, 452, COLORS["blue"]),
        (1308, 376, COLORS["amber"]),
        (1416, 550, COLORS["blue"]),
        (1214, 660, COLORS["amber"]),
        (1576, 480, COLORS["blue"]),
    ]
    lines = [
        ((1120, 452), (1308, 376)),
        ((1308, 376), (1416, 550)),
        ((1416, 550), (1214, 660)),
        ((1416, 550), (1576, 480)),
    ]
    for start, end in lines:
        draw.line((*start, *end), fill=color_with_alpha(COLORS["blue"], 170), width=4)
    for cx, cy, fill in nodes:
        draw.ellipse((cx - 18, cy - 18, cx + 18, cy + 18), fill=fill)
    base.alpha_composite(overlay)
    draw = ImageDraw.Draw(base)
    text(draw, (140, 166), "SHOT 04", f(SERIF_REGULAR, 24), COLORS["muted_dark"])
    text(draw, (140, 246), "Recover the thread", f(SERIF_BOLD, 74), COLORS["paper"])
    text(draw, (140, 324), "in seconds.", f(SERIF_BOLD, 74), COLORS["paper"])
    rounded_panel(draw, (140, 416, 780, 526), 26, COLORS["panel_dark"], outline="#384257")
    text(draw, (180, 458), "ASK RECALL", f(SANS_BOLD, 18), COLORS["muted_dark"])
    text(draw, (180, 498), "What changed in the pricing rollout and why?", f(SANS_REGULAR, 26), COLORS["paper"])
    rounded_panel(draw, (150, 590, 870, 812), 28, COLORS["card"], outline=COLORS["linen"])
    text(draw, (196, 638), "GROUNDED ANSWER", f(SANS_BOLD, 18), COLORS["muted"])
    text(draw, (196, 694), "Pricing changed after security review", f(SERIF_BOLD, 40), COLORS["ink"])
    text(draw, (196, 742), "Linked sources: decision record, meeting note, sprint blocker.", f(SANS_REGULAR, 22), COLORS["muted"])
    save_versions(base.convert("RGB"), "scene-04-knowledge-graph")


def scene_05():
    base = base_image("#F6F1E8").convert("RGBA")
    overlay = rgba_canvas()
    draw = ImageDraw.Draw(overlay)
    draw_grid(draw, step=120, color=COLORS["linen"], alpha=55)
    base.alpha_composite(overlay)
    draw = ImageDraw.Draw(base)
    text(draw, (140, 166), "SHOT 05", f(SERIF_REGULAR, 24), COLORS["muted"])
    text(draw, (140, 250), "Conversations.", f(SERIF_BOLD, 74), COLORS["ink"])
    text(draw, (140, 326), "Documents. Follow-through.", f(SERIF_BOLD, 68), COLORS["ink"])

    rounded_panel(draw, (130, 440, 630, 860), 30, COLORS["card"], outline=COLORS["linen"])
    text(draw, (170, 492), "SPRINT FLOW", f(SANS_BOLD, 18), COLORS["muted"])
    columns = [(170, "Todo"), (318, "Doing"), (466, "Done")]
    for x, label in columns:
        rounded_panel(draw, (x, 548, x + 126, 800), 20, "#F1E9DD", outline=COLORS["linen"])
        text(draw, (x + 28, 582), label, f(SANS_BOLD, 18), COLORS["ink"])
    rounded_panel(draw, (186, 620, 280, 684), 16, COLORS["white"], outline=COLORS["linen"])
    rounded_panel(draw, (334, 620, 428, 712), 16, COLORS["white"], outline=COLORS["blue"])
    rounded_panel(draw, (334, 730, 428, 794), 16, COLORS["white"], outline=COLORS["amber"])
    rounded_panel(draw, (482, 620, 576, 684), 16, COLORS["white"], outline=COLORS["linen"])

    rounded_panel(draw, (680, 440, 1100, 640), 30, COLORS["panel_dark"], outline="#3B322B")
    text(draw, (720, 492), "BLOCKER SIGNAL", f(SANS_BOLD, 18), COLORS["muted_dark"])
    text(draw, (720, 552), "Security review delaying rollout", f(SERIF_BOLD, 40), COLORS["paper"])
    text(draw, (720, 604), "Linked to decision context and sprint flow.", f(SANS_REGULAR, 22), COLORS["muted_dark"])

    rounded_panel(draw, (1140, 440, 1760, 860), 30, COLORS["card"], outline=COLORS["linen"])
    text(draw, (1182, 492), "LINKED CONTEXT", f(SANS_BOLD, 18), COLORS["muted"])
    rounded_panel(draw, (1182, 536, 1412, 626), 18, COLORS["blue_soft"], outline=COLORS["blue"])
    text(draw, (1210, 590), "Decision: pricing review", f(SANS_BOLD, 24), COLORS["ink"])
    rounded_panel(draw, (1436, 536, 1720, 626), 18, COLORS["amber_soft"], outline=COLORS["amber"])
    text(draw, (1464, 590), "Document: security annex", f(SANS_BOLD, 24), COLORS["ink"])
    rounded_panel(draw, (1182, 656, 1720, 806), 22, COLORS["white"], outline=COLORS["linen"])
    text(draw, (1214, 708), "Execution stays grounded in the record.", f(SERIF_BOLD, 34), COLORS["ink"])
    text(draw, (1214, 760), "Teams can see what changed, why it changed, and what still needs attention.", f(SANS_REGULAR, 22), COLORS["muted"])
    save_versions(base.convert("RGB"), "scene-05-execution")


def scene_06():
    base = base_image(COLORS["paper"]).convert("RGBA")
    overlay = rgba_canvas()
    draw = ImageDraw.Draw(overlay)
    draw.ellipse((180, -120, 900, 620), fill=color_with_alpha(COLORS["blue"], 22))
    draw.ellipse((920, 120, 1820, 980), fill=color_with_alpha(COLORS["amber"], 22))
    base.alpha_composite(overlay)
    draw = ImageDraw.Draw(base)
    text(draw, (140, 166), "SHOT 06", f(SERIF_REGULAR, 24), COLORS["muted"])
    logo = brandlogo_art(width=1020, height=240)
    base.alpha_composite(logo, ((WIDTH - logo.width) // 2, 280))
    draw = ImageDraw.Draw(base)
    text(draw, (960, 550), "Decision memory for teams", f(SERIF_BOLD, 82), COLORS["ink"], anchor="mm")
    text(draw, (960, 662), "Start your workspace. Recover the thread.", f(SANS_REGULAR, 28), COLORS["muted"], anchor="mm")
    save_versions(base.convert("RGB"), "scene-06-close")


def portrait_scene_01():
    width = PORTRAIT_WIDTH
    height = PORTRAIT_HEIGHT
    base = Image.new("RGBA", (width, height), COLORS["paper"])
    overlay = sized_rgba_canvas(width, height)
    draw = ImageDraw.Draw(overlay)
    draw_grid_on(draw, width, height, step=100, color=COLORS["linen"], alpha=75)
    draw.ellipse((660, -120, 1260, 520), fill=color_with_alpha(COLORS["amber"], 24))
    draw.ellipse((-220, 1060, 560, 1940), fill=color_with_alpha(COLORS["blue"], 20))
    base.alpha_composite(overlay)
    draw = ImageDraw.Draw(base)

    text(draw, (88, 110), "SHOT 01", f(SERIF_REGULAR, 22), COLORS["muted"])
    draw.multiline_text((88, 210), "Work moves fast.\nContext disappears\nfaster.", font=f(SERIF_BOLD, 74), fill=COLORS["ink"], spacing=10)

    cards = [
        (88, 720, 992, 860, "Decision", "Pricing review approved"),
        (88, 892, 992, 1032, "Meeting Note", "Rollout risks need alignment"),
        (88, 1064, 992, 1204, "Issue Update", "Sprint slipped by two days"),
        (88, 1236, 992, 1376, "Document", "Security annex draft"),
        (88, 1408, 992, 1548, "Ask Recall", "What changed?"),
    ]
    for x1, y1, x2, y2, title, subtitle in cards:
        rounded_panel(draw, (x1, y1, x2, y2), 26, COLORS["card"], outline=COLORS["linen"])
        text(draw, (x1 + 34, y1 + 42), title, f(SANS_BOLD, 24), COLORS["ink"])
        text(draw, (x1 + 34, y1 + 86), subtitle, f(SANS_REGULAR, 22), COLORS["muted"])

    save_versions(base.convert("RGB"), "scene-01-problem-9x16")


def portrait_scene_02():
    width = PORTRAIT_WIDTH
    height = PORTRAIT_HEIGHT
    base = Image.new("RGBA", (width, height), COLORS["night"])
    overlay = sized_rgba_canvas(width, height)
    draw = ImageDraw.Draw(overlay)
    draw.ellipse((-140, 180, 760, 1180), fill=color_with_alpha(COLORS["blue"], 18))
    draw.ellipse((360, 460, 1220, 1560), fill=color_with_alpha(COLORS["amber"], 16))
    draw.ellipse((190, 430, 890, 1130), outline=color_with_alpha(COLORS["blue"], 112), width=3)
    draw.ellipse((290, 530, 790, 1030), outline=color_with_alpha(COLORS["blue"], 72), width=2)
    for start, end in [
        ((210, 520), (430, 700)),
        ((874, 570), (650, 720)),
        ((260, 1090), (454, 902)),
        ((878, 1086), (660, 906)),
    ]:
        draw.line((*start, *end), fill=color_with_alpha(COLORS["blue"], 150), width=4)
    for cx, cy, tone in [
        (210, 520, COLORS["amber"]),
        (874, 570, COLORS["blue"]),
        (260, 1090, COLORS["blue"]),
        (878, 1086, COLORS["amber"]),
    ]:
        draw.ellipse((cx - 13, cy - 13, cx + 13, cy + 13), fill=tone)
    base.alpha_composite(overlay)
    draw = ImageDraw.Draw(base)

    text(draw, (88, 110), "SHOT 02", f(SERIF_REGULAR, 22), COLORS["muted_dark"])
    draw.multiline_text((88, 200), "Search the why\nbehind the work.", font=f(SERIF_BOLD, 74), fill=COLORS["paper"], spacing=10)
    text(draw, (88, 390), "Memory lines reconnect the record.", f(SANS_REGULAR, 28), COLORS["muted_dark"])
    mark = brandmark_art(size=320)
    base.alpha_composite(mark, ((width - mark.width) // 2, 600))
    draw = ImageDraw.Draw(base)
    rounded_panel(draw, (88, 1360, 992, 1508), 30, "#1B263A", outline="#34517A")
    text(draw, (134, 1418), "LOOK ANCHOR", f(SANS_BOLD, 18), "#C8D8FF")
    text(draw, (134, 1462), "Calm editorial SaaS film, premium memory lines, restrained motion.", f(SANS_REGULAR, 22), COLORS["paper"])

    save_versions(base.convert("RGB"), "scene-02-brand-emergence-9x16")


def portrait_scene_03():
    width = PORTRAIT_WIDTH
    height = PORTRAIT_HEIGHT
    base = Image.new("RGBA", (width, height), COLORS["ink"])
    draw = ImageDraw.Draw(base)
    rounded_panel(draw, (58, 90, 1022, 1830), 42, COLORS["panel_dark"], outline="#3B322B")
    rounded_panel(draw, (112, 220, 968, 930), 34, "#25201C", outline="#3B322B")
    draw.rectangle((160, 280, 920, 324), fill="#322B26")
    draw.rounded_rectangle((190, 380, 520, 456), radius=18, fill="#2A241F", outline="#3B322B", width=2)
    draw.rounded_rectangle((190, 492, 780, 614), radius=24, fill="#2A241F", outline="#3B322B", width=2)
    draw.rounded_rectangle((190, 652, 420, 728), radius=18, fill="#2A241F", outline="#3B322B", width=2)
    draw.rounded_rectangle((456, 652, 780, 728), radius=18, fill="#2A241F", outline="#3B322B", width=2)

    text(draw, (92, 126), "SHOT 03", f(SERIF_REGULAR, 22), COLORS["muted_dark"])
    rounded_panel(draw, (112, 980, 968, 1178), 28, COLORS["card"], outline=COLORS["linen"])
    text(draw, (158, 1038), "DECISION RECORD", f(SANS_BOLD, 18), COLORS["muted"])
    text(draw, (158, 1100), "Pricing review approved", f(SERIF_BOLD, 50), COLORS["ink"])

    rounded_panel(draw, (112, 1224, 526, 1436), 24, "#222631", outline="#384257")
    text(draw, (152, 1284), "RATIONALE", f(SANS_BOLD, 17), COLORS["muted_dark"])
    draw.multiline_text((152, 1334), "Price change aligns\nto rollout risk", font=f(SANS_REGULAR, 28), fill=COLORS["paper"], spacing=6)

    rounded_panel(draw, (554, 1224, 968, 1436), 24, "#221D19", outline="#3B322B")
    text(draw, (594, 1284), "LINKED CONTEXT", f(SANS_BOLD, 17), COLORS["muted_dark"])
    draw.multiline_text((594, 1334), "Conversation,\nsecurity review,\nsprint", font=f(SANS_REGULAR, 26), fill=COLORS["paper"], spacing=6)

    rounded_panel(draw, (112, 1496, 968, 1710), 28, "#1B263A", outline="#34517A")
    text(draw, (158, 1554), "ON-SCREEN COPY", f(SANS_BOLD, 17), "#C8D8FF")
    draw.multiline_text((158, 1622), "Decisions stay\nattached to the work.", font=f(SERIF_BOLD, 58), fill=COLORS["paper"], spacing=4)

    save_versions(base.convert("RGB"), "scene-03-decisions-9x16")


def portrait_scene_04():
    width = PORTRAIT_WIDTH
    height = PORTRAIT_HEIGHT
    base = Image.new("RGBA", (width, height), COLORS["night"])
    overlay = sized_rgba_canvas(width, height)
    draw = ImageDraw.Draw(overlay)
    for radius, alpha in [(170, 105), (290, 66)]:
        draw.ellipse((540 - radius, 970 - radius, 540 + radius, 970 + radius), outline=color_with_alpha(COLORS["blue"], alpha), width=3)
    lines = [
        ((430, 840), (586, 760)),
        ((586, 760), (706, 930)),
        ((706, 930), (536, 1080)),
        ((706, 930), (820, 890)),
    ]
    for start, end in lines:
        draw.line((*start, *end), fill=color_with_alpha(COLORS["blue"], 170), width=4)
    for cx, cy, fill in [
        (430, 840, COLORS["blue"]),
        (586, 760, COLORS["amber"]),
        (706, 930, COLORS["blue"]),
        (536, 1080, COLORS["amber"]),
        (820, 890, COLORS["blue"]),
    ]:
        draw.ellipse((cx - 18, cy - 18, cx + 18, cy + 18), fill=fill)
    base.alpha_composite(overlay)
    draw = ImageDraw.Draw(base)

    text(draw, (88, 110), "SHOT 04", f(SERIF_REGULAR, 22), COLORS["muted_dark"])
    draw.multiline_text((88, 200), "Recover the thread\nin seconds.", font=f(SERIF_BOLD, 72), fill=COLORS["paper"], spacing=8)
    rounded_panel(draw, (88, 450, 992, 616), 28, COLORS["panel_dark"], outline="#384257")
    text(draw, (132, 512), "ASK RECALL", f(SANS_BOLD, 18), COLORS["muted_dark"])
    draw.multiline_text((132, 554), "What changed in the\npricing rollout and why?", font=f(SANS_REGULAR, 30), fill=COLORS["paper"], spacing=6)

    rounded_panel(draw, (88, 1238, 992, 1520), 30, COLORS["card"], outline=COLORS["linen"])
    text(draw, (134, 1304), "GROUNDED ANSWER", f(SANS_BOLD, 18), COLORS["muted"])
    draw.multiline_text((134, 1372), "Pricing changed after\nsecurity review", font=f(SERIF_BOLD, 50), fill=COLORS["ink"], spacing=4)
    draw.multiline_text((134, 1490), "Linked sources: decision record,\nmeeting note, sprint blocker.", font=f(SANS_REGULAR, 24), fill=COLORS["muted"], spacing=6)

    save_versions(base.convert("RGB"), "scene-04-knowledge-graph-9x16")


def portrait_scene_05():
    width = PORTRAIT_WIDTH
    height = PORTRAIT_HEIGHT
    base = Image.new("RGBA", (width, height), "#F6F1E8")
    overlay = sized_rgba_canvas(width, height)
    draw = ImageDraw.Draw(overlay)
    draw_grid_on(draw, width, height, step=100, color=COLORS["linen"], alpha=52)
    base.alpha_composite(overlay)
    draw = ImageDraw.Draw(base)

    text(draw, (88, 110), "SHOT 05", f(SERIF_REGULAR, 22), COLORS["muted"])
    draw.multiline_text((88, 200), "Conversations.\nDocuments.\nFollow-through.", font=f(SERIF_BOLD, 72), fill=COLORS["ink"], spacing=6)

    rounded_panel(draw, (88, 520, 992, 1100), 30, COLORS["card"], outline=COLORS["linen"])
    text(draw, (128, 580), "SPRINT FLOW", f(SANS_BOLD, 18), COLORS["muted"])
    columns = [(132, "Todo"), (416, "Doing"), (700, "Done")]
    for x, label in columns:
        rounded_panel(draw, (x, 650, x + 220, 1034), 24, "#F1E9DD", outline=COLORS["linen"])
        text(draw, (x + 56, 698), label, f(SANS_BOLD, 20), COLORS["ink"])
    rounded_panel(draw, (162, 760, 322, 852), 20, COLORS["white"], outline=COLORS["linen"])
    rounded_panel(draw, (446, 760, 606, 890), 20, COLORS["white"], outline=COLORS["blue"])
    rounded_panel(draw, (446, 914, 606, 1006), 20, COLORS["white"], outline=COLORS["amber"])
    rounded_panel(draw, (730, 760, 890, 852), 20, COLORS["white"], outline=COLORS["linen"])

    rounded_panel(draw, (88, 1164, 992, 1370), 30, COLORS["panel_dark"], outline="#3B322B")
    text(draw, (132, 1228), "BLOCKER SIGNAL", f(SANS_BOLD, 18), COLORS["muted_dark"])
    draw.multiline_text((132, 1286), "Security review\ndelaying rollout", font=f(SERIF_BOLD, 46), fill=COLORS["paper"], spacing=4)

    rounded_panel(draw, (88, 1428, 992, 1756), 30, COLORS["card"], outline=COLORS["linen"])
    text(draw, (132, 1490), "LINKED CONTEXT", f(SANS_BOLD, 18), COLORS["muted"])
    rounded_panel(draw, (132, 1544, 486, 1636), 18, COLORS["blue_soft"], outline=COLORS["blue"])
    text(draw, (168, 1600), "Decision: pricing review", f(SANS_BOLD, 24), COLORS["ink"])
    rounded_panel(draw, (520, 1544, 948, 1636), 18, COLORS["amber_soft"], outline=COLORS["amber"])
    text(draw, (556, 1600), "Document: security annex", f(SANS_BOLD, 24), COLORS["ink"])
    draw.multiline_text((132, 1688), "Execution stays grounded in the record.\nTeams can see what changed and why.", font=f(SANS_REGULAR, 24), fill=COLORS["muted"], spacing=8)

    save_versions(base.convert("RGB"), "scene-05-execution-9x16")


def portrait_scene_06():
    width = PORTRAIT_WIDTH
    height = PORTRAIT_HEIGHT
    base = Image.new("RGBA", (width, height), COLORS["paper"])
    overlay = sized_rgba_canvas(width, height)
    draw = ImageDraw.Draw(overlay)
    draw.ellipse((-120, -60, 760, 940), fill=color_with_alpha(COLORS["blue"], 22))
    draw.ellipse((300, 540, 1180, 1860), fill=color_with_alpha(COLORS["amber"], 22))
    base.alpha_composite(overlay)
    draw = ImageDraw.Draw(base)

    text(draw, (88, 110), "SHOT 06", f(SERIF_REGULAR, 22), COLORS["muted"])
    logo = brandlogo_art(width=860, height=220)
    base.alpha_composite(logo, ((width - logo.width) // 2, 520))
    draw = ImageDraw.Draw(base)
    draw.multiline_text((540, 930), "Decision memory\nfor teams", font=f(SERIF_BOLD, 78), fill=COLORS["ink"], spacing=6, anchor="mm", align="center")
    text(draw, (540, 1110), "Start your workspace. Recover the thread.", f(SANS_REGULAR, 30), COLORS["muted"], anchor="mm")
    rounded_panel(draw, (208, 1248, 872, 1366), 30, COLORS["card"], outline=COLORS["linen"])
    text(draw, (540, 1308), "Knoledgr.com", f(SANS_BOLD, 28), COLORS["ink"], anchor="mm")

    save_versions(base.convert("RGB"), "scene-06-close-9x16")


def portrait_contact_sheet():
    tile_w = 540
    tile_h = 960
    canvas = Image.new("RGB", (tile_w * 2, tile_h * 3), COLORS["paper"])
    files = [
        OUTPUT_DIR / "scene-01-problem-9x16.jpg",
        OUTPUT_DIR / "scene-02-brand-emergence-9x16.jpg",
        OUTPUT_DIR / "scene-03-decisions-9x16.jpg",
        OUTPUT_DIR / "scene-04-knowledge-graph-9x16.jpg",
        OUTPUT_DIR / "scene-05-execution-9x16.jpg",
        OUTPUT_DIR / "scene-06-close-9x16.jpg",
    ]
    for index, path in enumerate(files):
        image = Image.open(path).resize((tile_w, tile_h))
        x = (index % 2) * tile_w
        y = (index // 2) * tile_h
        canvas.paste(image, (x, y))
    save_versions(canvas, "knoledgr-sora-vertical-contact-sheet")


def contact_sheet():
    tile_w = 960
    tile_h = 540
    canvas = Image.new("RGB", (tile_w * 2, tile_h * 3), COLORS["paper"])
    files = [
        OUTPUT_DIR / "scene-01-problem.jpg",
        OUTPUT_DIR / "scene-02-brand-emergence.jpg",
        OUTPUT_DIR / "scene-03-decisions.jpg",
        OUTPUT_DIR / "scene-04-knowledge-graph.jpg",
        OUTPUT_DIR / "scene-05-execution.jpg",
        OUTPUT_DIR / "scene-06-close.jpg",
    ]
    for index, path in enumerate(files):
        image = Image.open(path).resize((tile_w, tile_h))
        x = (index % 2) * tile_w
        y = (index // 2) * tile_h
        canvas.paste(image, (x, y))
    save_versions(canvas, "knoledgr-sora-contact-sheet")


def manifest():
    manifest_path = OUTPUT_DIR / "README.md"
    manifest_path.write_text(
        "\n".join(
            [
                "# Knoledgr Sora Upload Images",
                "",
                "Raster exports ready for Sora upload.",
                "",
                "Files included:",
                "- `scene-01-problem.(png|jpg)`",
                "- `scene-02-brand-emergence.(png|jpg)`",
                "- `scene-03-decisions.(png|jpg)`",
                "- `scene-04-knowledge-graph.(png|jpg)`",
                "- `scene-05-execution.(png|jpg)`",
                "- `scene-06-close.(png|jpg)`",
                "- `knoledgr-sora-contact-sheet.(png|jpg)`",
                "- `scene-01-problem-9x16.(png|jpg)`",
                "- `scene-02-brand-emergence-9x16.(png|jpg)`",
                "- `scene-03-decisions-9x16.(png|jpg)`",
                "- `scene-04-knowledge-graph-9x16.(png|jpg)`",
                "- `scene-05-execution-9x16.(png|jpg)`",
                "- `scene-06-close-9x16.(png|jpg)`",
                "- `knoledgr-sora-vertical-contact-sheet.(png|jpg)`",
                "- `knoledgr-brandmark-reference.(png|jpg)`",
                "- `knoledgr-brandlogo-reference.(png|jpg)`",
                "- `knoledgr-memory-orbit-reference.(png|jpg)`",
                "- `knoledgr-aurora-reference.(png|jpg)`",
                "",
                "Suggested upload order:",
                "1. `scene-01-problem`",
                "2. `scene-02-brand-emergence`",
                "3. `scene-03-decisions`",
                "4. `scene-04-knowledge-graph`",
                "5. `scene-05-execution`",
                "6. `scene-06-close`",
                "",
                "Vertical / Reels pack:",
                "1. `scene-01-problem-9x16`",
                "2. `scene-02-brand-emergence-9x16`",
                "3. `scene-03-decisions-9x16`",
                "4. `scene-04-knowledge-graph-9x16`",
                "5. `scene-05-execution-9x16`",
                "6. `scene-06-close-9x16`",
                "",
                "Extra look anchors:",
                "- `knoledgr-brandmark-reference` for logo geometry",
                "- `knoledgr-brandlogo-reference` for title-card branding",
                "- `knoledgr-memory-orbit-reference` for graph-style compositions",
                "- `knoledgr-aurora-reference` for atmospheric background matching",
                "",
                "Use the matching prompts from `../knoledgr-30s-shot-prompts.md`.",
                "",
            ]
        ),
        encoding="utf-8",
    )


def main():
    generate_reference_assets()
    scene_01()
    scene_02()
    scene_03()
    scene_04()
    scene_05()
    scene_06()
    portrait_scene_01()
    portrait_scene_02()
    portrait_scene_03()
    portrait_scene_04()
    portrait_scene_05()
    portrait_scene_06()
    contact_sheet()
    portrait_contact_sheet()
    manifest()
    print(f"Generated raster storyboard uploads in: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
