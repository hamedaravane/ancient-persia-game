"""Deterministic platform-size exports of the existing victory emblem. No new art."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "art/reference/ui/emblems/victory.png"
OUTPUT = ROOT / "public/icons"


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    with Image.open(SOURCE) as original:
        # Same reviewed frame as ART.victory; preserve the complete supplied emblem.
        emblem = original.convert("RGBA").crop((40, 50, 1215, 1185))
        for name, size, fraction in [
            ("icon-192.png", 192, 0.86),
            ("icon-512.png", 512, 0.86),
            ("maskable-512.png", 512, 0.56),
            ("apple-touch-icon.png", 180, 0.84),
        ]:
            icon = Image.new("RGBA", (size, size), (24, 42, 54, 255))
            image = emblem.copy()
            image.thumbnail((round(size * fraction), round(size * fraction)), Image.Resampling.LANCZOS)
            icon.alpha_composite(image, ((size - image.width) // 2, (size - image.height) // 2))
            icon.convert("RGB").save(OUTPUT / name, optimize=True)


if __name__ == "__main__":
    main()
