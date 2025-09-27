"""
pdf_to_md_pro.py — Heuristic PDF → Markdown converter tuned for lesson PDFs.

Usage:
  python scripts/pdf_to_md_pro.py "input.pdf" "docs/lessons/volume1_unit01.md" --title "Unit 01" --pagebreak --keep-page-headings

Requires:
  pip install pdfplumber

Heuristics:
- Joins wrapped lines into paragraphs.
- Un-hyphenates end-of-line hyphens (e.g., com- \n prar → comprar).
- Preserves blank-lines between paragraphs.
- Attempts to recognize simple headings (ALL CAPS short lines, or lines ending with ":" with few words).
- Inserts page markers if --pagebreak is provided.
"""

import re, sys, argparse, textwrap, pathlib

def unhyphenate(text):
    # Combine lines split with hyphens at EOL: "com-\nprar" -> "comprar"
    text = re.sub(r'(\w+)-\s*\n\s*(\w+)', r'\1\2', text)
    return text

def join_wrapped_lines(lines):
    out, buf = [], []
    def flush():
        nonlocal buf, out
        if not buf: return
        paragraph = " ".join(s.strip() for s in buf)
        out.append(paragraph)
        buf = []
    for line in lines:
        s = line.rstrip()
        if not s.strip():
            flush()
            out.append("")  # preserve blank line
            continue
        # If line ends with sentence end or colon, likely paragraph boundary
        if re.search(r'[.!?:]$', s) and len(s) > 40:
            buf.append(s)
            flush()
        else:
            buf.append(s)
    flush()
    # remove leading/trailing empties
    while out and not out[0].strip(): out.pop(0)
    while out and not out[-1].strip(): out.pop()
    return out

def looks_like_heading(s):
    t = s.strip()
    if len(t) <= 2: return False
    # ALL CAPS short line
    if t.isupper() and len(t.split()) <= 7:
        return True
    # Ends with ":" and reasonably short
    if t.endswith(":") and len(t.split()) <= 10:
        return True
    return False

def mark_headings(paragraphs):
    res = []
    for p in paragraphs:
        if looks_like_heading(p):
            res.append("# " + p.strip(": ").strip())
        else:
            res.append(p)
    return res

def process_text(raw, opts):
    raw = raw.replace("\r\n", "\n").replace("\r", "\n")
    raw = unhyphenate(raw)
    lines = raw.split("\n")
    # Drop page footers/headers if simple patterns are detected
    cleaned = []
    for s in lines:
        t = s.strip()
        # Skip obvious page numbers
        if re.fullmatch(r'\d{1,3}', t): 
            continue
        cleaned.append(s)
    paragraphs = join_wrapped_lines(cleaned)
    paragraphs = mark_headings(paragraphs) if opts.keep_page_headings else paragraphs
    return paragraphs

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("pdf_in")
    ap.add_argument("md_out")
    ap.add_argument("--title", default="Imported Lesson")
    ap.add_argument("--pagebreak", action="store_true", help="Insert '---' between pages")
    ap.add_argument("--keep-page-headings", action="store_true", help="Promote short ALL CAPS lines to headings")
    args = ap.parse_args()

    try:
        import pdfplumber
    except ImportError:
        print("pdfplumber not installed. pip install pdfplumber", file=sys.stderr)
        sys.exit(1)

    out_parts = []
    with pdfplumber.open(args.pdf_in) as pdf:
        for i, page in enumerate(pdf.pages, start=1):
            text = page.extract_text() or ""
            out_parts.append(text)
            if args.pagebreak and i < len(pdf.pages):
                out_parts.append("\n---\n")

    raw = "\n".join(out_parts)
    paragraphs = process_text(raw, args)

    fm = textwrap.dedent(f"""---\ntitle: {args.title}\ntags: [imported]\n---\n\n# {args.title}\n""").strip()
    body = "\n\n".join(paragraphs) + "\n"
    pathlib.Path(args.md_out).write_text(fm + "\n\n" + body, encoding="utf-8")
    print(f"Wrote {args.md_out}")

if __name__ == "__main__":
    main()