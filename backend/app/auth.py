import hmac
from datetime import UTC, datetime, timedelta

import jwt
from fastapi import HTTPException, status

from app.config import Settings


def authenticate(username: str, password: str, settings: Settings) -> str:
    if not settings.auth_username or not settings.auth_password or not settings.jwt_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication is not configured",
        )
    if not (
        hmac.compare_digest(username, settings.auth_username)
        and hmac.compare_digest(password, settings.auth_password)
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )

    expires_at = datetime.now(UTC) + timedelta(minutes=settings.jwt_expire_minutes)
    return jwt.encode(
        {"sub": username, "exp": expires_at}, settings.jwt_secret, algorithm="HS256"
    )


def verify_token(token: str, settings: Settings) -> str:
    if not settings.jwt_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication is not configured",
        )
    try:
        subject = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"]).get("sub")
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
    if not isinstance(subject, str) or not subject:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid access token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return subject
