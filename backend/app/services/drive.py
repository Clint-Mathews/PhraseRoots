from pathlib import Path

from google.auth import default as default_credentials
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload


class DriveUploadError(RuntimeError):
    pass


def get_drive(folder_id: str, service_account_file: str):
    if not folder_id:
        raise DriveUploadError("GOOGLE_DRIVE_FOLDER_ID is not configured")
    if service_account_file and not Path(service_account_file).is_file():
        raise DriveUploadError("Google service account file was not found")

    try:
        scopes = [
            "https://www.googleapis.com/auth/drive.file",
            "https://www.googleapis.com/auth/drive.readonly",
            "https://www.googleapis.com/auth/drive.metadata.readonly",
        ]
        if service_account_file:
            credentials = Credentials.from_service_account_file(
                service_account_file, scopes=scopes
            )
        else:
            credentials, _ = default_credentials(scopes=scopes)
        return build("drive", "v3", credentials=credentials, cache_discovery=False)
    except Exception as exc:
        raise DriveUploadError("Could not authenticate with Google Drive") from exc


def upload_recording(
    path: str,
    filename: str,
    mime_type: str,
    folder_id: str,
    service_account_file: str,
) -> str:
    try:
        drive = get_drive(folder_id, service_account_file)
        uploaded = (
            drive.files()
            .create(
                body={"name": filename, "parents": [folder_id]},
                media_body=MediaFileUpload(path, mimetype=mime_type, resumable=True),
                fields="id",
            )
            .execute()
        )
        return uploaded["id"]
    except Exception as exc:
        raise DriveUploadError("Could not upload recording to Google Drive") from exc


def list_recordings(folder_id: str, service_account_file: str) -> list[dict[str, str]]:
    try:
        drive = get_drive(folder_id, service_account_file)
        response = (
            drive.files()
            .list(
                q=f"'{folder_id}' in parents and trashed = false",
                orderBy="createdTime desc",
                pageSize=100,
                fields="files(id,name,mimeType,createdTime,webViewLink)",
            )
            .execute()
        )
        return response.get("files", [])
    except DriveUploadError:
        raise
    except Exception as exc:
        raise DriveUploadError("Could not list recordings from Google Drive") from exc


def download_recording(
    file_id: str, folder_id: str, service_account_file: str
) -> tuple[str, str, bytes]:
    try:
        drive = get_drive(folder_id, service_account_file)
        metadata = (
            drive.files()
            .get(fileId=file_id, fields="name,mimeType,parents")
            .execute()
        )
        if folder_id not in metadata.get("parents", []):
            raise DriveUploadError("Recording is not in the configured Google Drive folder")
        content = drive.files().get_media(fileId=file_id).execute()
        return metadata["name"], metadata["mimeType"], content
    except DriveUploadError:
        raise
    except Exception as exc:
        raise DriveUploadError("Could not download recording from Google Drive") from exc
