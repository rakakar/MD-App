#!/usr/bin/env python3
"""Every app icon — web, iOS, Android — from the designer's raster master.

    python3 -m pip install pillow
    python3 scripts/build-icons.py

Source of truth is `design_docs/DPS-logo-new_1000x1000.png` (14 Oct 2026): a
rounded tile in exactly #A64E12, the app's terracotta, with the mark in white.
Its vector twin, `design_docs/DPS logo new.svg`, is what the app draws in its
chrome (`/brand/logo.svg`); the icons are cut from the PNG so nothing here
needs an SVG renderer. Re-run when the logo changes — the outputs are
committed, so nothing in `npm run build` depends on Python.

The white art is lifted off the tile and placed per platform, inside the
circle each one crops to:

    web icon-192/512 (purpose any)   the tile as drawn, corners clear
    icon-maskable-512                full bleed, art radius 0.38 (Android: 0.40)
    apple-touch-icon, iOS AppIcon    full bleed, opaque, art radius 0.42
    favicon 16/32/48                 the tree alone — the lettering is noise there
    Android ic_launcher              the tile; _round: a circle, art radius 0.44
    Android adaptive                 art only at radius 0.30 (safe zone 66/108)
                                     over a solid terracotta layer
"""
import os
import sys

try:
    from PIL import Image, ImageDraw
except ImportError:  # pragma: no cover - the message is the point
    sys.exit("needs pillow: python3 -m pip install pillow")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "design_docs/DPS-logo-new_1000x1000.png")
BG = (166, 78, 18)        # #A64E12 — the master's tile, and the app's terracotta
ART_R = 0.435             # the art's radius, as a fraction of the canvas
TREE_R = 0.362            # the tree's — the ring of lettering starts at ~0.38
CENTRE = (0.497, 0.499)   # the art's centre in the master

master = Image.open(SRC).convert("RGBA")
W = master.width


def lift(limit=None):
    """The white art alone, antialiasing kept: how far a pixel's blue has risen
    from the tile's (18) toward white is how opaque its white is. `limit`
    keeps only what is inside that radius of the centre."""
    art = Image.new("RGBA", master.size, (255, 255, 255, 0))
    mp, ap = master.load(), art.load()
    cx, cy = CENTRE[0] * W, CENTRE[1] * W
    for y in range(W):
        for x in range(W):
            if limit and (x - cx) ** 2 + (y - cy) ** 2 > (limit * W) ** 2:
                continue
            r, g, b, a = mp[x, y]
            ap[x, y] = (255, 255, 255, max(0, min(255, round((b - BG[2]) / (255 - BG[2]) * a))))
    return art


ART = lift()


def placed(size, safe_r, under=None):
    """The art centred on `under` (or clear), scaled so its radius is safe_r·size."""
    canvas = under or Image.new("RGBA", (size, size), (0, 0, 0, 0))
    a = ART.resize((round(size * safe_r / ART_R),) * 2, Image.LANCZOS)
    off = (size - a.width) // 2
    canvas.alpha_composite(a, (off, off))
    return canvas


def full_bleed(size, safe_r):
    return placed(size, safe_r, Image.new("RGBA", (size, size), BG + (255,)))


def round_crop(im):
    s = im.width * 4
    m = Image.new("L", (s, s), 0)
    ImageDraw.Draw(m).ellipse((0, 0, s - 1, s - 1), fill=255)
    out = im.copy()
    out.putalpha(m.resize(im.size, Image.LANCZOS))
    return out


def tile(size):
    return master.resize((size, size), Image.LANCZOS)


def save(im, rel, opaque=False):
    path = os.path.join(ROOT, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if opaque:
        # the App Store wants a plain opaque PNG
        im.convert("RGB").save(path, optimize=True)
    else:
        # two colours and their antialiasing: a 256-colour palette is lossless
        # to the eye and a fraction of the bytes
        method = Image.Quantize.FASTOCTREE if im.mode == "RGBA" else Image.Quantize.MEDIANCUT
        im.quantize(colors=256, method=method).save(path, optimize=True)
    print(f"{rel:68} {im.width:>5}px {os.path.getsize(path):>7} B")


# web
save(tile(192), "public/icon-192.png")
save(tile(512), "public/icon-512.png")
save(full_bleed(512, 0.38), "public/icon-maskable-512.png")
save(full_bleed(180, 0.42), "public/apple-touch-icon.png", opaque=True)

# favicon: the tree on a small rounded tile
tree = lift(TREE_R)
c = (CENTRE[0] * W, CENTRE[1] * W)
tree = tree.crop((int(c[0] - TREE_R * W), int(c[1] - TREE_R * W), int(c[0] + TREE_R * W), int(c[1] + TREE_R * W)))
fav = Image.new("RGBA", (2048, 2048), (0, 0, 0, 0))
ImageDraw.Draw(fav).rounded_rectangle((0, 0, 2047, 2047), radius=450, fill=BG + (255,))
t = tree.resize((1761, 1761), Image.LANCZOS)
fav.alpha_composite(t, ((2048 - 1761) // 2,) * 2)
fav.resize((256, 256), Image.LANCZOS).save(os.path.join(ROOT, "src/app/favicon.ico"), sizes=[(16, 16), (32, 32), (48, 48)])
print(f"{'src/app/favicon.ico':68}  16/32/48 {os.path.getsize(os.path.join(ROOT, 'src/app/favicon.ico')):>7} B")

# iOS
save(full_bleed(1024, 0.42), "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png", opaque=True)

# Android
RES = "android/app/src/main/res"
for d, n in {"ldpi": 36, "mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}.items():
    save(tile(n), f"{RES}/mipmap-{d}/ic_launcher.png")
    save(round_crop(full_bleed(n * 4, 0.44)).resize((n, n), Image.LANCZOS), f"{RES}/mipmap-{d}/ic_launcher_round.png")
for d, n in {"ldpi": 81, "mdpi": 108, "hdpi": 162, "xhdpi": 216, "xxhdpi": 324, "xxxhdpi": 432}.items():
    save(placed(n, 0.30), f"{RES}/mipmap-{d}/ic_launcher_foreground.png")
    save(Image.new("RGB", (n, n), BG), f"{RES}/mipmap-{d}/ic_launcher_background.png")
