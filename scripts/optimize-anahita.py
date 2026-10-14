"""Compatibility entrypoint for the Anahita-only export commands."""

from pathlib import Path
import subprocess
import sys


if __name__ == "__main__":
    raise SystemExit(subprocess.call([
        sys.executable, str(Path(__file__).with_name("optimize-images.py")),
        "--group", "anahita", *sys.argv[1:],
    ]))
