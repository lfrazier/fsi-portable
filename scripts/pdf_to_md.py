
"""
Basic scaffold to extract text from PDFs to Markdown.
Install: pip install pdfplumber
Usage:
  python scripts/pdf_to_md.py input.pdf docs/lessons/lesson-from-pdf.md
"""
import sys, pdfplumber, textwrap, pathlib

def pdf_to_markdown(pdf_path, md_path):
    out = []
    with pdfplumber.open(pdf_path) as pdf:
        for i, page in enumerate(pdf.pages, start=1):
            text = page.extract_text() or ""
            out.append(f"\n\n## Page {i}\n\n" + text)
    body = "\n".join(out)
    front_matter = textwrap.dedent("""
    ---
    title: Imported from PDF
    tags: [imported]
    ---
    """).strip()
    md = front_matter + "\n\n# Imported Lesson\n" + body + "\n"
    pathlib.Path(md_path).write_text(md, encoding="utf-8")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python scripts/pdf_to_md.py <input.pdf> <output.md>")
        sys.exit(1)
    pdf_to_markdown(sys.argv[1], sys.argv[2])
