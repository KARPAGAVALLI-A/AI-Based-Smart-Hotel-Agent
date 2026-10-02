"""
tts_service.py
---------------
Text-to-Speech synthesis via gTTS (Google Translate TTS). Maps our internal
language codes (en / ta / ta-Latn) to gTTS locales — Tanglish replies are
synthesized using the Tamil voice since the *reply* text itself is written
in proper Tamil script for natural speech, even if the user typed Tanglish.
"""

import base64
import io
from gtts import gTTS

_LANG_MAP = {
    "en": "en",
    "ta": "ta",
    "ta-Latn": "ta",
    "hi": "hi",
    "ml": "ml",
    "te": "te",
    "kn": "kn",
}


def synthesize(text: str, language: str = "en") -> dict:
    gtts_lang = _LANG_MAP.get(language, "en")
    tts = gTTS(text=text, lang=gtts_lang)
    buf = io.BytesIO()
    tts.write_to_fp(buf)
    b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
    return {"audio_base64": f"data:audio/mp3;base64,{b64}", "language": gtts_lang}
