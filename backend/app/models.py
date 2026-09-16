from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class TranslationRequest(BaseModel):
    text: str = Field(min_length=1, max_length=12_000)
    source_language: Literal["Thai", "English"]
    target_language: Literal["Thai", "English"]


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=128)
    password: str = Field(min_length=1, max_length=256)


class TokenResponse(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"


class TranslationContent(BaseModel):
    model_config = ConfigDict(extra="forbid")

    romanization: str = Field(min_length=1)
    translation: str = Field(min_length=1)
    notes: list[str]


class TranslationResponse(TranslationContent):
    source_text: str
    source_language: Literal["Thai", "English"]
    target_language: Literal["Thai", "English"]
    provider: Literal["openrouter"] = "openrouter"


class AudioTranslationResponse(TranslationResponse):
    filename: str


class RecordingUploadResponse(BaseModel):
    filename: str
    file_id: str
    web_view_link: str


class RecordingListItem(BaseModel):
    file_id: str
    filename: str
    mime_type: str
    created_time: str
    web_view_link: str


class RecordingListResponse(BaseModel):
    recordings: list[RecordingListItem]


class DriveRecordingTranslationRequest(BaseModel):
    file_id: str = Field(min_length=1)


class PhraseAnalysisRequest(BaseModel):
    transcript: str = Field(min_length=1, max_length=24_000)


class PhraseOccurrence(BaseModel):
    text: str
    count: int = Field(ge=2)


class PhraseAnalysisResponse(BaseModel):
    phrases: list[PhraseOccurrence]
