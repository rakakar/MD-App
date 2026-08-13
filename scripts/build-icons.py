#!/usr/bin/env python3
"""Render the brand mark into the raster icons browsers cannot take as SVG.

    python3 -m pip install cairosvg pillow
    python3 scripts/build-icons.py

Source of truth is `design_docs/MD Study logo.svg` (the designer's export);
`public/brand/logo.svg` is that file with its path data rounded to 2dp and its
fixed 40x40 dropped so CSS sizing wins. Re-run this whenever the logo changes —
the outputs are committed, so nothing in `npm run build` depends on Python.

Not written as a node script despite the repo being npm: rasterising SVG in
node means pulling sharp or a headless browser into devDependencies for a file
that changes about once a year.
"""
import io
import os
import sys

try:
    import cairosvg
    from PIL import Image
except ImportError:  # pragma: no cover - the message is the point
    sys.exit("needs cairosvg + pillow: python3 -m pip install cairosvg pillow")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "public/brand/logo.svg")
BRAND = (205, 114, 51, 255)  # #CD7233 — the tile colour in the designer's file


def render(size):
    png = cairosvg.svg2png(url=SRC, output_width=size, output_height=size)
    return Image.open(io.BytesIO(png)).convert("RGBA")


def transparent(size, out):
    """The mark on its own rounded tile, corners clear."""
    render(size).save(os.path.join(ROOT, out))


def filled(size, out, inset=0.0):
    """Opaque brand-coloured square with the mark centred on it."""
    canvas = Image.new("RGBA", (size, size), BRAND)
    inner = round(size * (1 - 2 * inset))
    off = (size - inner) // 2
    canvas.alpha_composite(render(inner), (off, off))
    canvas.convert("RGB").save(os.path.join(ROOT, out))


OUTPUTS = [
    "public/icon-192.png",
    "public/icon-512.png",
    "public/icon-maskable-512.png",
    "public/apple-touch-icon.png",
    "src/app/favicon.ico",
]

# manifest icons: the tile as drawn, so a launcher that respects transparency
# gets the designer's corner radius rather than a square
transparent(192, OUTPUTS[0])
transparent(512, OUTPUTS[1])

# maskable: Android crops to a circle of 80% of the icon, so the tile has to
# bleed past the edges and the emblem has to sit inside that circle. 5% inset
# puts the emblem's outer ring at ~76% — inside the safe zone, with margin.
filled(512, OUTPUTS[2], inset=0.05)

# iOS applies its own squircle and ignores transparency; a clear-cornered PNG
# comes out as a mark on a black square
filled(180, OUTPUTS[3])

# favicon: 16px cannot hold the ring text — the tree is what survives, and
# that is what a tab shows
render(64).save(os.path.join(ROOT, OUTPUTS[4]), sizes=[(16, 16), (32, 32), (48, 48)])

for path in OUTPUTS:
    print(f"{path:34} {os.path.getsize(os.path.join(ROOT, path)):>7} bytes")
