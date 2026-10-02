# KPR Hotel — Multilingual, Multimodal Conversational Food Ordering Agent

An end-to-end, production-structured LLM-style application: a voice- and
text-capable food ordering assistant for a fictional restaurant, **KPR
Hotel**, that speaks English, Tamil, and Tanglish (transliterated Tamil),
manages a live shopping cart, and drives a full checkout → UPI QR → order
confirmation flow.

```
kpr-hotel-agent/
├── backend/                  FastAPI application (Python)
│   ├── app/
│   │   ├── main.py             API routes
│   │   ├── models/schemas.py    Pydantic request/response models
│   │   ├── services/
│   │   │   ├── language_service.py   EN / TA / Tanglish detection + per-session preference
│   │   │   ├── intent_service.py      Intent classification + slot filling (qty, item, customizations)
│   │   │   ├── menu_service.py         TF-IDF vector search over the menu ("vector DB" stand-in)
│   │   │   ├── cart_service.py          Cart + checkout state machine
│   │   │   ├── chat_service.py            Dialogue orchestrator tying everything together
│   │   │   ├── qr_service.py                UPI QR code generation
│   │   │   ├── stt_service.py                Speech-to-Text (Google Web Speech API / optional Whisper)
│   │   │   ├── tts_service.py                 Text-to-Speech (gTTS, bilingual)
│   │   │   └── templates.py                    Bilingual response copy
│   │   └── data/menu.json        Menu content (bilingual)
│   └── requirements.txt
└── frontend/                 Vanilla HTML/CSS/JS split-screen UI (no build step)
    ├── index.html
    ├── styles.css
    └── app.js
```

## Why this architecture

This mirrors how a real production LLM application is composed, without
requiring a paid LLM API key to run the demo end-to-end:

- **NLP**: language detection (script-based + Tanglish lexicon +
  `langdetect` fallback), regex/fuzzy-match intent classification and slot
  filling (`rapidfuzz`), TF-IDF vector semantic search over the menu
  (`scikit-learn`) standing in for an embeddings + vector-DB pipeline.
- **ML/DL**: the ASR (`SpeechRecognition` → Google Web Speech API, with an
  optional `openai-whisper` swap already stubbed in `stt_service.py`) and
  TTS (`gTTS`) legs are the deep-learning-backed voice components.
- **Clean separation of concerns**: every capability (language, intent,
  menu search, cart, QR, voice) is its own service module behind a small
  interface, so any one piece — e.g. swapping the rule-based intent parser
  for a LangChain agent with Claude tool-calling — is a drop-in change
  that doesn't touch the rest of the system.
- **Single source of truth**: the backend owns all state (cart, checkout
  stage, language preference); the frontend just renders whatever `cart`
  object comes back with each response, so the UI can never drift out of
  sync with the server.

## Running it

### 1. Backend

```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

The API is now live at `http://localhost:8000` (interactive docs at
`/docs`). Voice endpoints need internet access at runtime, since both the
default ASR (Google Web Speech API) and TTS (`gTTS`) call out to Google —
text chat works fully offline.

### 2. Frontend

The frontend is a static site with no build step. Simplest option:

```bash
cd frontend
python3 -m http.server 5500
```

Then open `http://localhost:5500`. If your backend runs on a different
host/port, set it before `app.js` loads:

```html
<script>window.KPR_API_BASE = "http://localhost:8000/api";</script>
<script src="app.js"></script>
```

### 3. Dish photos

The menu cards are photo-led (Swiggy/Zomato style). Each item in
`backend/app/data/menu.json` points at `assets/dishes/<item_id>.jpg`. Those
files are **not** committed — fetch them once:

```bash
cd backend
python scripts/fetch_dish_images.py
```

The script searches Wikimedia Commons using each item's `image_query` field,
centre-crops the best result to 4:3, saves it to `frontend/assets/dishes/`, and
records the file page and licence for every download in
`frontend/assets/dishes/CREDITS.md`.

- Re-fetch everything: `python scripts/fetch_dish_images.py --force`
- One dish only: `python scripts/fetch_dish_images.py bir-001`
- **Use your own photos:** just drop `bir-001.jpg` (etc.) into
  `frontend/assets/dishes/` — the script leaves existing files alone. Real
  photos of the actual kitchen will always beat stock, so swap these out before
  any demo you care about.

If a photo is missing the card degrades to a warm gradient tile showing the
dish's emoji, so the UI never shows a broken image.

Adding a new dish to the menu needs four extra fields alongside the usual ones:
`image`, `image_query`, `emoji`, and `rating` / `rating_count`. Ratings are
placeholder values for the demo — replace them with real numbers (or delete the
fields, in which case the rating pill just won't render).

## Try it out

Type or say (mic button) things like:

- `"Vanakkam"` → bilingual greeting
- `"What's spicy on the menu?"` → vector search over the menu
- `"Enaku 2 chicken biryani double masala venum"` → adds 2× Chicken
  Biryani with an "Extra/Double Masala" customization to the cart
- `"show cart"` → live bill summary
- `"checkout"` → asks Cash or UPI
- `"UPI"` → renders a real-format, scannable UPI QR code with the exact
  calculated total embedded
- `"paid"` → fires the "Order Confirmed!" event and turns the live bill
  into a finalized receipt

## Notes on scope for this demo

- **Cart/session store** is in-process memory (`dict`) for simplicity —
  swap for Redis in `cart_service.py`/`language_service.py` to survive
  restarts and scale across workers.
- **QR codes** encode a genuine `upi://pay` deep link (scannable by real
  UPI apps) against a mock merchant VPA (`kprhotel@upi`) — no real payment
  gateway is wired up.
- **Menu search** uses TF-IDF rather than neural embeddings to keep the
  install lightweight; `menu_service.py` is written so swapping in
  `sentence-transformers` + a real vector index (FAISS/pgvector) only
  touches that one file.
- **Intent parsing** is rule-based (regex + fuzzy match) rather than an
  LLM function-calling chain, again to keep the demo runnable without an
  API key — `intent_service.py`/`chat_service.py` expose the same
  `{intent, entities}` → `reply` interface an LLM-agent version would.
