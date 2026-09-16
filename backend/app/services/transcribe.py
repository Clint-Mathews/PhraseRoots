from functools import lru_cache
from pathlib import Path

from faster_whisper import WhisperModel


WHISPER_MODEL = "small"
WHISPER_COMPUTE_TYPE = "int8"


class TranscriptionError(RuntimeError):
    pass


@lru_cache
def get_model(model_name: str, compute_type: str) -> WhisperModel:
    return WhisperModel(model_name, device="cpu", compute_type=compute_type)


def transcribe_thai(
    audio_path: str | Path,
    model_name: str = WHISPER_MODEL,
    compute_type: str = WHISPER_COMPUTE_TYPE,
) -> str:
    try:
        model = get_model(model_name, compute_type)
        segments, _ = model.transcribe(
            str(audio_path),
            language="th",
            task="transcribe",
        )
    except Exception as exc:
        raise TranscriptionError("The audio could not be transcribed") from exc

    text = "".join(segment.text for segment in segments).strip()
    if not text:
        raise TranscriptionError("No Thai speech was detected in the audio")
    return text
