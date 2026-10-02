"""
stt_service.py
---------------
Automatic Speech Recognition (ASR). Uses Google's free Web Speech API via
the `SpeechRecognition` package by default (good enough for a demo and
requires no model download); the code is structured so swapping in
`openai-whisper` for offline, higher-accuracy, code-switch-aware
recognition is a one-function change (see `transcribe_with_whisper`).

Both Tamil (`ta-IN`) and English (`en-IN`) locales are attempted and the
higher-confidence transcript is kept, since users may switch languages
mid-conversation.
"""

import io

try:
    import speech_recognition as sr
    from pydub import AudioSegment
    recognizer = sr.Recognizer()
    _HAS_SR = True
except ImportError:
    _HAS_SR = False
    recognizer = None


def _to_wav(audio_bytes: bytes, content_type: str) -> io.BytesIO:
    """Normalizes arbitrary browser-recorded audio (webm/ogg/mp3) to WAV
    PCM, which SpeechRecognition's engines require."""
    fmt = "webm" if "webm" in content_type else ("ogg" if "ogg" in content_type else None)
    audio = AudioSegment.from_file(io.BytesIO(audio_bytes), format=fmt)
    wav_io = io.BytesIO()
    audio.export(wav_io, format="wav")
    wav_io.seek(0)
    return wav_io


def transcribe(audio_bytes: bytes, content_type: str = "audio/webm", language_hint: str | None = None) -> dict:
    """Returns {"text": str, "language_hint": str}.
    Supports English, Tamil, Hindi, Malayalam, Telugu, and Kannada locales.
    """
    if not _HAS_SR:
        raise RuntimeError("Speech recognition engine not installed on server; client-side recognition is active.")
    wav_io = _to_wav(audio_bytes, content_type)
    with sr.AudioFile(wav_io) as source:
        audio_data = recognizer.record(source)

    locales = [language_hint] if language_hint else ["en-IN", "ta-IN", "hi-IN", "ml-IN", "te-IN", "kn-IN"]
    for locale in locales:
        try:
            text = recognizer.recognize_google(audio_data, language=locale)
            if text.strip():
                return {"text": text, "language_hint": locale}
        except (sr.UnknownValueError, KeyError, AttributeError):
            continue
        except sr.RequestError as e:
            raise RuntimeError(f"ASR service unavailable: {e}")

    # Fallback try all
    for locale in ("en-IN", "ta-IN", "hi-IN", "ml-IN", "te-IN", "kn-IN"):
        try:
            text = recognizer.recognize_google(audio_data, language=locale)
            if text.strip():
                return {"text": text, "language_hint": locale}
        except Exception:
            continue

    return {"text": "", "language_hint": "en-IN"}



def transcribe_with_whisper(audio_bytes: bytes) -> dict:
    """Optional offline path using openai-whisper (uncomment requirements.txt
    entry to enable). Whisper natively handles Tamil/English code-switching
    better than the Google Web Speech API, at the cost of a larger install
    and slower first-load (model download)."""
    import whisper  # local import: optional heavy dependency
    model = whisper.load_model("small")
    import tempfile
    with tempfile.NamedTemporaryFile(suffix=".wav") as tmp:
        wav_io = _to_wav(audio_bytes, "audio/webm")
        tmp.write(wav_io.read())
        tmp.flush()
        result = model.transcribe(tmp.name)
    return {"text": result["text"], "language_hint": result.get("language", "en")}
