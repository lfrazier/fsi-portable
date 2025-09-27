"""
convert_all.py — Batch convert PDFs in a folder to docs/lessons/*.md

Usage:
  python scripts/convert_all.py "path/to/pdfs" --prefix "unit" --title-prefix "Unit "

For each PDF found:
- Output filename: docs/lessons/{prefix}{stem}.md (stem = numeric part or basename)
- Title: {title-prefix}{stem}
"""

import re, os, argparse, pathlib, subprocess, sys

SCRIPT_DIR = pathlib.Path(__file__).parent.resolve()
PRO = SCRIPT_DIR / "pdf_to_md_pro.py"

def numeric_stem(name):
    # Try to grab first number block, else use full stem
    m = re.search(r'(\d+)', name)
    return m.group(1) if m else name

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("pdf_dir")
    ap.add_argument("--prefix", default="unit")
    ap.add_argument("--title-prefix", default="Unit ")
    ap.add_argument("--pagebreak", action="store_true")
    ap.add_argument("--keep-page-headings", action="store_true")
    args = ap.parse_args()

    pdf_dir = pathlib.Path(args.pdf_dir)
    out_dir = pathlib.Path(__file__).parent.parent / "docs" / "lessons"
    out_dir.mkdir(parents=True, exist_ok=True)

    pdfs = sorted([p for p in pdf_dir.glob("*.pdf")])
    if not pdfs:
        print("No PDFs found.")
        sys.exit(0)

    for p in pdfs:
        stem = numeric_stem(p.stem)
        out = out_dir / f"{args.prefix}{stem}.md"
        title = f"{args.title_prefix}{stem}"
        cmd = [sys.executable, str(PRO), str(p), str(out), "--title", title]
        if args.pagebreak: cmd.append("--pagebreak")
        if args.keep_page_headings: cmd.append("--keep-page-headings")
        print("Converting:", p.name, "->", out.name)
        subprocess.run(cmd, check=True)

if __name__ == "__main__":
    main()