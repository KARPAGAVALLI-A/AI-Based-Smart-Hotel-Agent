"""
language_service.py
--------------------
Detects the customer's language (English / Tamil / Tanglish) from raw text
and keeps a per-session preference so replies stay consistent even when the
user briefly code-switches (a very common pattern in Tamil-English speech).

Detection strategy (cheap, deterministic, no external API calls):
1. Unicode range check -> if Tamil script characters are present, it's `ta`.
2. Otherwise run it through a curated Tanglish lexicon (romanized Tamil
   function words/particles that rarely appear in English) using token
   overlap. If enough hits, classify as `ta-Latn` (Tanglish).
3. Fall back to `langdetect` for a generic en/other decision.
"""

import re

try:
    from langdetect import detect, DetectorFactory, LangDetectException
    DetectorFactory.seed = 0
    _HAS_LANGDETECT = True
except ImportError:
    _HAS_LANGDETECT = False

TAMIL_UNICODE_RE = re.compile(r"[\u0B80-\u0BFF]")

# High-signal romanized Tamil tokens (particles, common verbs/nouns) that
# almost never occur in plain English text. Kept lowercase.
TANGLISH_LEXICON = {
    "venum", "vendam", "vaanga", "sapta", "sapdunga", "kelvi", "kettale",
    "pathina", "irukku", "iruku", "illa", "epdi", "eppadi", "enaku",
    "enakku", "unga", "ungaluku", "nalla", "seri", "romba", "konjam",
    "veg-ah", "veggaa", "double", "masala", "venuma", "sollunga", "anna",
    "akka", "thala", "saapadu", "saptu", "kudunga", "poitu", "vanga",
    "sapdalam", "correctaa", "correct", "ah", "aa", "nu", "pa", "da",
}

TANGLISH_TOKEN_RE = re.compile(r"[a-zA-Z]+")


def _tanglish_score(text: str) -> float:
    tokens = [t.lower() for t in TANGLISH_TOKEN_RE.findall(text)]
    if not tokens:
        return 0.0
    hits = sum(1 for t in tokens if t in TANGLISH_LEXICON)
    return hits / len(tokens)


def detect_language(text: str) -> str:
    """Returns one of: 'ta' (Tamil script), 'ta-Latn' (Tanglish), 'en'."""
    if not text or not text.strip():
        return "en"

    if TAMIL_UNICODE_RE.search(text):
        return "ta"

    if _tanglish_score(text) >= 0.15:
        return "ta-Latn"

    if _HAS_LANGDETECT:
        try:
            code = detect(text)
            if code == "ta":
                return "ta-Latn"  # langdetect flagged Tamil-ish romanized text
        except Exception:
            pass

    return "en"


class LanguagePreferenceStore:
    """Tiny in-memory per-session language preference tracker.

    In production this would be backed by Redis / a user profile table so
    the preference persists across sessions and devices.
    """

    def __init__(self):
        self._prefs: dict[str, str] = {}

    def get(self, session_id: str) -> str | None:
        return self._prefs.get(session_id)

    def update_from_text(self, session_id: str, text: str) -> str:
        """Detects language of `text` and updates the stored preference.

        We only "lock in" a new preference once, then keep using it — this
        avoids flip-flopping between en/ta-Latn on short utterances like
        "ok" while still respecting an explicit language switch request.
        """
        detected = detect_language(text)
        current = self._prefs.get(session_id)
        if current is None:
            self._prefs[session_id] = detected
        elif detected != "en" and detected != current:
            # explicit switch to a Tamil variant overrides a weaker guess
            self._prefs[session_id] = detected
        return self._prefs.get(session_id, detected)

    def set(self, session_id: str, lang: str):
        self._prefs[session_id] = lang


language_prefs = LanguagePreferenceStore()
