
"""
Convert a simple CSV with columns Front,Back,Audio(optional) to TSV for Anki.
Usage:
  python scripts/make_anki_tsv.py vocab.csv anki.tsv
"""
import csv, sys

def convert(csv_in, tsv_out):
    with open(csv_in, newline='', encoding='utf-8') as f, open(tsv_out, "w", encoding='utf-8', newline='') as g:
        reader = csv.DictReader(f)
        for row in reader:
            front = row.get("Front", "").strip()
            back = row.get("Back", "").strip()
            audio = row.get("Audio", "").strip()
            fields = [front, back]
            if audio:
                fields.append(f"[sound:{audio}]")
            g.write("\t".join(fields) + "\n")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python scripts/make_anki_tsv.py <vocab.csv> <anki.tsv>")
        sys.exit(1)
    convert(sys.argv[1], sys.argv[2])
