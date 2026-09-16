import os
from pathlib import Path
from tempfile import NamedTemporaryFile

from fastapi import Depends, FastAPI, File, HTTPException, UploadFile, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.middleware.cors import CORSMiddleware
from starlette.concurrency import run_in_threadpool

from app.config import get_settings
from app.auth import authenticate, verify_token
from app.models import (
    AudioTranslationResponse,
    DriveRecordingTranslationRequest,
    LoginRequest,
    RecordingListItem,
    RecordingListResponse,
    RecordingUploadResponse,
    TranslationRequest,
    TranslationResponse,
    TokenResponse,
)
from app.services.drive import (
    DriveUploadError,
    download_recording,
    list_recordings,
    upload_recording,
)
from app.services.transcribe import TranscriptionError, transcribe_thai
from app.services.translate import TranslationError, translate_text


app = FastAPI(title="Thai Learning API")
settings = get_settings()
bearer_scheme = HTTPBearer(auto_error=False)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.get("/health")
def health():
    return {"status": "ok", "translation_provider": "gemini"}


@app.post("/auth/login", response_model=TokenResponse)
def login(request: LoginRequest) -> TokenResponse:
    return TokenResponse(access_token=authenticate(request.username, request.password, settings))


def require_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> str:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return verify_token(credentials.credentials, settings)


@app.post("/translate", response_model=TranslationResponse)
def translate(request: TranslationRequest, _user: str = Depends(require_user)) -> TranslationResponse:
    try:
        content = translate_text(
            request.text,
            request.source_language,
            request.target_language,
            settings.gemini_api_key,
            settings.gemini_model,
        )
    except TranslationError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc

    return TranslationResponse(
        source_text=request.text,
        source_language=request.source_language,
        target_language=request.target_language,
        **content.model_dump(),
    )


@app.post("/translate/audio", response_model=AudioTranslationResponse)
async def translate_audio(audio: UploadFile = File(...), _user: str = Depends(require_user)) -> AudioTranslationResponse:
    filename = audio.filename or "audio"
    suffix = Path(filename).suffix.lower()
    if suffix not in {".m4a", ".mp3", ".wav", ".webm"}:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Audio must be an .m4a, .mp3, .wav, or .webm file",
        )

    temp_path: str | None = None
    size = 0
    try:
        with NamedTemporaryFile(delete=False, suffix=suffix) as destination:
            temp_path = destination.name
            while chunk := await audio.read(1024 * 1024):
                size += len(chunk)
                if size > settings.max_audio_upload_bytes:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail="Audio exceeds the configured upload limit",
                    )
                destination.write(chunk)

        if size == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Audio file is empty",
            )

        transcript = await run_in_threadpool(
            transcribe_thai,
            temp_path,
            settings.whisper_model,
            settings.whisper_compute_type,
        )
        content = await run_in_threadpool(
            translate_text,
            transcript,
            "Thai",
            "English",
            settings.gemini_api_key,
            settings.gemini_model,
        )
    except (TranscriptionError, TranslationError) as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    finally:
        await audio.close()
        if temp_path:
            try:
                os.unlink(temp_path)
            except FileNotFoundError:
                pass

    return AudioTranslationResponse(
        filename=filename,
        source_text=transcript,
        source_language="Thai",
        target_language="English",
        **content.model_dump(),
    )


@app.post("/translate/audio/drive", response_model=AudioTranslationResponse)
async def translate_drive_recording(
    request: DriveRecordingTranslationRequest, _user: str = Depends(require_user),
) -> AudioTranslationResponse:
    temp_path: str | None = None
    try:
        filename, _mime_type, content = await run_in_threadpool(
            download_recording,
            request.file_id,
            settings.google_drive_folder_id,
            settings.google_service_account_file,
        )
        if len(content) > settings.max_audio_upload_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="Audio exceeds the configured upload limit",
            )
        suffix = Path(filename).suffix.lower()
        if suffix not in {".m4a", ".mp3", ".wav", ".webm"}:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail="Audio must be an .m4a, .mp3, .wav, or .webm file",
            )
        if not content:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Audio file is empty"
            )
        with NamedTemporaryFile(delete=False, suffix=suffix) as destination:
            temp_path = destination.name
            destination.write(content)
        transcript = await run_in_threadpool(
            transcribe_thai,
            temp_path,
            settings.whisper_model,
            settings.whisper_compute_type,
        )
        content = await run_in_threadpool(
            translate_text,
            transcript,
            "Thai",
            "English",
            settings.gemini_api_key,
            settings.gemini_model,
        )
    except (DriveUploadError, TranscriptionError, TranslationError) as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)
        ) from exc
    finally:
        if temp_path:
            try:
                os.unlink(temp_path)
            except FileNotFoundError:
                pass

    return AudioTranslationResponse(
        filename=filename,
        source_text=transcript,
        source_language="Thai",
        target_language="English",
        **content.model_dump(),
    )


@app.post("/recordings", response_model=RecordingUploadResponse)
async def upload_recording_to_drive(audio: UploadFile = File(...), _user: str = Depends(require_user)) -> RecordingUploadResponse:
    filename = audio.filename or "recording.webm"
    suffix = Path(filename).suffix.lower()
    if suffix not in {".m4a", ".mp3", ".wav", ".webm"}:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Audio must be an .m4a, .mp3, .wav, or .webm file",
        )

    temp_path: str | None = None
    size = 0
    try:
        with NamedTemporaryFile(delete=False, suffix=suffix) as destination:
            temp_path = destination.name
            while chunk := await audio.read(1024 * 1024):
                size += len(chunk)
                if size > settings.max_audio_upload_bytes:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail="Audio exceeds the configured upload limit",
                    )
                destination.write(chunk)
        if size == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Audio file is empty",
            )
        file_id = await run_in_threadpool(
            upload_recording,
            temp_path,
            filename,
            audio.content_type or "audio/webm",
            settings.google_drive_folder_id,
            settings.google_service_account_file,
        )
    except DriveUploadError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)
        ) from exc
    finally:
        await audio.close()
        if temp_path:
            try:
                os.unlink(temp_path)
            except FileNotFoundError:
                pass

    return RecordingUploadResponse(
        filename=filename,
        file_id=file_id,
        web_view_link=f"https://drive.google.com/file/d/{file_id}/view",
    )


@app.get("/recordings", response_model=RecordingListResponse)
async def get_recordings(_user: str = Depends(require_user)) -> RecordingListResponse:
    try:
        recordings = await run_in_threadpool(
            list_recordings,
            settings.google_drive_folder_id,
            settings.google_service_account_file,
        )
    except DriveUploadError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)
        ) from exc

    return RecordingListResponse(
        recordings=[
            RecordingListItem(
                file_id=recording["id"],
                filename=recording["name"],
                mime_type=recording["mimeType"],
                created_time=recording["createdTime"],
                web_view_link=recording.get(
                    "webViewLink", f"https://drive.google.com/file/d/{recording['id']}/view"
                ),
            )
            for recording in recordings
        ]
    )
