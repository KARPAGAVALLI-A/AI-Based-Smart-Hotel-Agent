"""
fetch_dish_images.py
--------------------
Downloads one real photograph per menu item into frontend/assets/dishes/.

Where the photos come from
--------------------------
Wikimedia Commons — freely licensed, hot-link friendly, no API key needed.
For every item in backend/app/data/menu.json the script searches Commons using
that item's "image_query" field, picks the first usable JPEG/PNG, crops it to a
4:3 card shape and saves it as  frontend/assets/dishes/<item_id>.jpg.

Usage
-----
    cd backend
    python scripts/fetch_dish_images.py            # fetch anything missing
    python scripts/fetch_dish_images.py --force    # re-download everything
    python scripts/fetch_dish_images.py bir-001    # just one item

Replacing a photo with your own
-------------------------------
Drop your own picture at frontend/assets/dishes/<item_id>.jpg (e.g.
bir-001.jpg for Chicken Biryani) and the script will leave it alone unless you
pass --force. Real photos of your own kitchen always look better than stock —
use this script only to get the demo looking right on day one.

Attribution
-----------
Each download's Commons file page + licence is written to
frontend/assets/dishes/CREDITS.md. Keep that file with the project.
"""

from __future__ import annotations

import argparse
import io
import json
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
import urllib.parse
import urllib.request
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent          # backend/
MENU_PATH = ROOT / "app" / "data" / "menu.json"
OUT_DIR = ROOT.parent / "frontend" / "assets" / "dishes"
CREDITS_PATH = OUT_DIR / "CREDITS.md"

API = "https://commons.wikimedia.org/w/api.php"
# Commons blocks requests without a descriptive User-Agent.
UA = "KPR-Hotel-Agent/1.0 (college project; menu image fetcher)"

CARD_W, CARD_H = 800, 600      # 4:3 — matches the .dish-photo aspect ratio
OK_MIME = {"image/jpeg", "image/png", "image/webp"}


def _get(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read()


def search_commons(query: str, limit: int = 12) -> list[dict]:
    """Returns candidate files: [{'title', 'url', 'mime', 'descriptionurl', 'license'}]."""
    params = {
        "action": "query",
        "format": "json",
        "generator": "search",
        "gsrsearch": query,
        "gsrnamespace": "6",          # File: namespace
        "gsrlimit": str(limit),
        "prop": "imageinfo",
        "iiprop": "url|mime|extmetadata",
        "iiurlwidth": "1200",         # ask for a sane thumbnail, not the 20 MB original
    }
    data = json.loads(_get(f"{API}?{urllib.parse.urlencode(params)}").decode("utf-8"))
    pages = (data.get("query") or {}).get("pages") or {}

    out = []
    for page in pages.values():
        info = (page.get("imageinfo") or [{}])[0]
        if info.get("mime") not in OK_MIME:
            continue
        meta = info.get("extmetadata") or {}
        out.append({
            "title": page.get("title", ""),
            "url": info.get("thumburl") or info.get("url"),
            "mime": info["mime"],
            "descriptionurl": info.get("descriptionurl", ""),
            "license": (meta.get("LicenseShortName") or {}).get("value", "see file page"),
            "artist": _strip_html((meta.get("Artist") or {}).get("value", "Unknown")),
        })
    return [c for c in out if c["url"]]


def _strip_html(value: str) -> str:
    import re
    return re.sub(r"<[^>]+>", "", value).strip()


def to_card_jpeg(raw: bytes) -> bytes:
    """Centre-crops to 4:3 and encodes a web-sized JPEG."""
    img = Image.open(io.BytesIO(raw))
    img = img.convert("RGB")

    target = CARD_W / CARD_H
    w, h = img.size
    if w / h > target:                      # too wide -> trim the sides
        new_w = int(h * target)
        left = (w - new_w) // 2
        img = img.crop((left, 0, left + new_w, h))
    else:                                   # too tall -> trim top/bottom
        new_h = int(w / target)
        top = (h - new_h) // 2
        img = img.crop((0, top, w, top + new_h))

    img = img.resize((CARD_W, CARD_H), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=82, optimize=True)
    return buf.getvalue()


def fetch_one(item: dict, force: bool) -> dict | None:
    item_id = item["id"]
    dest = OUT_DIR / f"{item_id}.jpg"

    if dest.exists() and not force:
        print(f"  · {item_id:<12} already have {dest.name} — skipping")
        return None

    query = item.get("image_query") or item["name_en"]
    print(f"  · {item_id:<12} searching Commons for {query!r}")

    try:
        candidates = search_commons(query)
    except Exception as exc:
        print(f"    ! search failed: {exc}")
        return None

    for cand in candidates:
        try:
            raw = _get(cand["url"])
            dest.write_bytes(to_card_jpeg(raw))
            print(f"    ✓ saved {dest.name}  ({cand['title']})")
            return {"item_id": item_id, "name": item["name_en"], **cand}
        except Exception as exc:
            print(f"    … {cand['title']} unusable ({exc}), trying next")

    print(f"    ! no usable photo found for {item_id} — the card will fall back to its emoji tile")
    return None


def write_credits(rows: list[dict]) -> None:
    if not rows:
        return
    existing = CREDITS_PATH.read_text(encoding="utf-8") if CREDITS_PATH.exists() else ""
    lines = [existing] if existing else [
        "# Dish photo credits\n",
        "Photos fetched from Wikimedia Commons by `backend/scripts/fetch_dish_images.py`.",
        "Each file below is reused under the licence noted; follow the file page link",
        "for the full licence text and author details.\n",
    ]
    for r in rows:
        lines.append(
            f"- **{r['name']}** (`{r['item_id']}.jpg`) — {r['title']} · "
            f"{r['artist']} · {r['license']} · <{r['descriptionurl']}>"
        )
    CREDITS_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"\nCredits written to {CREDITS_PATH}")


def main() -> int:
    ap = argparse.ArgumentParser(description="Download dish photos for the KPR Hotel menu.")
    ap.add_argument("ids", nargs="*", help="only fetch these menu item ids (default: all)")
    ap.add_argument("--force", action="store_true", help="re-download even if the file exists")
    args = ap.parse_args()

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    items = json.loads(MENU_PATH.read_text(encoding="utf-8"))
    if args.ids:
        items = [i for i in items if i["id"] in set(args.ids)]
        if not items:
            print("No menu items matched those ids.")
            return 1

    print(f"Fetching photos for {len(items)} menu item(s) into {OUT_DIR}\n")
    rows = [row for item in items if (row := fetch_one(item, args.force))]
    write_credits(rows)
    print(f"\nDone — {len(rows)} new photo(s). Reload the frontend to see them.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
