#!/usr/bin/env python3
"""Every app icon — web, iOS, Android — and the in-app mark, from geometry.

    python3 -m pip install pillow
    python3 scripts/build-icons.py

Since 15 Nov 2026 the mark is the Sah Astitva (Coexistence) identity, and the
icon is the identity sheet's own "App icon — Umber" tile, as its app comp
draws it. The mark is four circles resting on one shared ground, radii
54 · 42 · 31 · 21 (अनुभव · विचार · व्यवहार · कार्य). On Umber the rings shift one
step lighter than on paper: Saffron Hint outside, Vermilion at the core.

Nothing is traced from a raster: the circles are drawn here, so every size is
exact and there is no master PNG to keep in step. The same geometry writes
`public/brand/sah-astitva-mark.svg` (the app's `BrandMark`) and the designer-facing
`design_docs/sah-astitva-app-icon.svg`. Solid only — the brand forbids the
gradient finish at icon and favicon sizes. The outputs are committed, so
nothing in `npm run build` depends on Python.

    Mark: a 0.78 bounding box, centred, as ChatGPT's and Gemini's icons are.

    web icon-192/512 (purpose any)   the rounded tile, corners clear
    icon-maskable-512                full bleed, mark as on the tile
    apple-touch-icon, iOS AppIcon    full bleed, opaque (the OS rounds it)
    favicon 16/32/48                 the rounded tile
    Android ic_launcher              the tile; _round: the same on a circle
    Android adaptive                 the mark alone, sized to the visible
                                     72/108 as it sits on the tile, over a
                                     solid Umber layer
"""
import os
import sys

try:
    from PIL import Image, ImageDraw
except ImportError:  # pragma: no cover - the message is the point
    sys.exit("needs pillow: python3 -m pip install pillow")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

UMBER = "#2B1E16"
# outermost first — the "on umber" colourway, one step lighter than on paper
RINGS = [(54, "#FBE9D2"), (42, "#F7BE6E"), (31, "#F2913D"), (21, "#E6622C")]
# The outer circle's radius as a fraction of the tile. Sized to the icons it
# sits beside on a home screen rather than to the identity sheet's 0.316: the
# ChatGPT and Gemini App Store icons (1024px, measured 15 Nov 2026) centre
# their mark in a bounding box 0.785 and 0.771 of the tile. 0.39 gives a
# 0.78 box, and still sits inside the maskable icon's 0.40 safe circle.
MARK_R = 0.39
AVATAR_R = MARK_R  # the round launcher icon matches the square one
TILE_CORNER = 0.22 # the tile's corner radius as a fraction of its side
SS = 4             # supersampling for antialiasing


def rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def circles(cx, cy, outer_r):
    """(cx, cy, r, colour) for each ring, all tangent at the shared ground."""
    ground = cy + outer_r
    k = outer_r / RINGS[0][0]
    return [(cx, ground - r * k, r * k, c) for r, c in RINGS]


def draw(size, mark_r, ground=None, corner=None, circle_bg=False):
    """The mark at outer radius `mark_r`·size, centred, over `ground`:
    None (clear), full bleed, a rounded tile (`corner`) or a circle."""
    S = size * SS
    im = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    if ground:
        fill = rgb(ground) + (255,)
        if circle_bg:
            d.ellipse((0, 0, S - 1, S - 1), fill=fill)
        elif corner:
            d.rounded_rectangle((0, 0, S - 1, S - 1), radius=corner * S, fill=fill)
        else:
            d.rectangle((0, 0, S, S), fill=fill)
    for cx, cy, r, c in circles(S / 2, S / 2, mark_r * S):
        d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=rgb(c) + (255,))
    return im.resize((size, size), Image.LANCZOS)


tile = lambda n: draw(n, MARK_R, UMBER, TILE_CORNER)
full_bleed = lambda n: draw(n, MARK_R, UMBER)
avatar = lambda n: draw(n, AVATAR_R, UMBER, circle_bg=True)


def save(im, rel, opaque=False):
    path = os.path.join(ROOT, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if opaque:
        # the App Store wants a plain opaque PNG
        im.convert("RGB").save(path, optimize=True)
    else:
        # five flat colours and their antialiasing: a 256-colour palette is
        # lossless to the eye and a fraction of the bytes
        im.quantize(colors=256, method=Image.Quantize.FASTOCTREE).save(path, optimize=True)
    print(f"{rel:68} {im.width:>5}px {os.path.getsize(path):>7} B")


def svg(size=160):
    """The tile as SVG — round numbers at this viewBox."""
    rings = "".join(
        f'<circle cx="{cx:g}" cy="{cy:g}" r="{r:g}" fill="{c}"/>'
        for cx, cy, r, c in circles(size / 2, size / 2, round(MARK_R * size, 2))
    )
    rx = round(TILE_CORNER * size, 2)
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}">'
        f'<rect width="{size}" height="{size}" rx="{rx:g}" fill="{UMBER}"/>{rings}</svg>\n'
    )


for rel in ("public/brand/sah-astitva-mark.svg", "design_docs/sah-astitva-app-icon.svg"):
    with open(os.path.join(ROOT, rel), "w") as f:
        f.write(svg())
    print(f"{rel:68}   (svg) {os.path.getsize(os.path.join(ROOT, rel)):>7} B")

# web
save(tile(192), "public/icon-192.png")
save(tile(512), "public/icon-512.png")
save(full_bleed(512), "public/icon-maskable-512.png")
save(full_bleed(180), "public/apple-touch-icon.png", opaque=True)

# favicon
tile(256).save(os.path.join(ROOT, "src/app/favicon.ico"), sizes=[(16, 16), (32, 32), (48, 48)])
print(f"{'src/app/favicon.ico':68}  16/32/48 {os.path.getsize(os.path.join(ROOT, 'src/app/favicon.ico')):>7} B")

# iOS
save(full_bleed(1024), "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png", opaque=True)

# Android
RES = "android/app/src/main/res"
for d, n in {"ldpi": 36, "mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}.items():
    save(tile(n), f"{RES}/mipmap-{d}/ic_launcher.png")
    save(avatar(n), f"{RES}/mipmap-{d}/ic_launcher_round.png")
for d, n in {"ldpi": 81, "mdpi": 108, "hdpi": 162, "xhdpi": 216, "xxhdpi": 324, "xxxhdpi": 432}.items():
    # the launcher shows the middle 72/108, so the tile's proportion there is
    # MARK_R · 72/108 of the full layer
    save(draw(n, MARK_R * 72 / 108), f"{RES}/mipmap-{d}/ic_launcher_foreground.png")
    save(Image.new("RGB", (n, n), rgb(UMBER)), f"{RES}/mipmap-{d}/ic_launcher_background.png")

# Splash screens — Android and iOS, light and night. Each keeps the ground it
# was drawn on (#FDFBF8 / #14110F, read off its own corner) and puts the tile
# in the middle at the proportion the old splash used, 0.62 of the short side.
import glob

SPLASH_TILE = 0.62
for path in sorted(
    glob.glob(os.path.join(ROOT, "android/app/src/main/res/drawable*/splash.png"))
    + glob.glob(os.path.join(ROOT, "ios/App/App/Assets.xcassets/Splash.imageset/Default@*.png"))
):
    old = Image.open(path).convert("RGB")
    out = Image.new("RGBA", old.size, old.getpixel((2, 2)) + (255,))
    n = round(min(old.size) * SPLASH_TILE)
    out.alpha_composite(tile(n), ((old.width - n) // 2, (old.height - n) // 2))
    save(out, os.path.relpath(path, ROOT), opaque=True)
