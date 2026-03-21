"""
Storage service — abstraction over local disk and S3-compatible CDN (Cloudflare R2, AWS S3).

Activated via env vars:
  S3_ENDPOINT_URL   — R2: https://<account>.r2.cloudflarestorage.com
                      S3: leave unset (boto3 uses default AWS endpoints)
  S3_ACCESS_KEY_ID  — R2/S3 access key
  S3_SECRET_KEY     — R2/S3 secret
  S3_BUCKET         — bucket name
  CDN_BASE_URL      — public URL prefix for stored objects (e.g. https://cdn.example.com)
                      If unset, falls back to S3 endpoint + bucket URL.

When env vars are absent, falls back to local disk in the ``uploads/`` directory.
"""
import os
import logging
import uuid
from typing import Optional

logger = logging.getLogger(__name__)

# ---- Configuration --------------------------------------------------------

_S3_ENDPOINT = os.getenv("S3_ENDPOINT_URL")
_S3_KEY_ID = os.getenv("S3_ACCESS_KEY_ID")
_S3_SECRET = os.getenv("S3_SECRET_KEY")
_S3_BUCKET = os.getenv("S3_BUCKET")
_CDN_BASE = os.getenv("CDN_BASE_URL", "").rstrip("/")

_USE_S3 = bool(_S3_KEY_ID and _S3_SECRET and _S3_BUCKET)

_s3_client = None

if _USE_S3:
    try:
        import boto3
        from botocore.config import Config as BotocoreConfig

        _s3_client = boto3.client(
            "s3",
            endpoint_url=_S3_ENDPOINT or None,
            aws_access_key_id=_S3_KEY_ID,
            aws_secret_access_key=_S3_SECRET,
            config=BotocoreConfig(signature_version="s3v4"),
        )
        logger.info(
            "Storage: S3-compatible backend initialised (bucket=%s, endpoint=%s)",
            _S3_BUCKET,
            _S3_ENDPOINT or "AWS default",
        )
    except ImportError:
        logger.warning("boto3 not installed — falling back to local disk storage")
        _USE_S3 = False
else:
    logger.info("Storage: local disk backend (set S3_* env vars to enable CDN)")

# ---- Public API -----------------------------------------------------------

LOCAL_UPLOAD_DIR = "uploads"
os.makedirs(LOCAL_UPLOAD_DIR, exist_ok=True)


async def save_image(content: bytes, extension: str) -> str:
    """Persist image bytes and return a URL/path usable as ``ClothingItem.image_path``.

    - CDN mode: uploads to S3 bucket, returns public CDN URL.
    - Local mode: writes to ``uploads/``, returns relative path like ``uploads/<uuid>.jpg``.
    """
    filename = f"{uuid.uuid4()}{extension}"

    if _USE_S3 and _s3_client is not None:
        return await _save_to_s3(content, filename, extension)

    return _save_to_disk(content, filename)


def _save_to_disk(content: bytes, filename: str) -> str:
    file_path = os.path.join(LOCAL_UPLOAD_DIR, filename)
    with open(file_path, "wb") as fh:
        fh.write(content)
    logger.debug("Saved image to disk: %s", file_path)
    return file_path.replace("\\", "/")


async def _save_to_s3(content: bytes, filename: str, extension: str) -> str:
    import asyncio

    content_type = _ext_to_mime(extension)
    key = f"clothing/{filename}"

    loop = asyncio.get_event_loop()
    await loop.run_in_executor(
        None,
        lambda: _s3_client.put_object(  # type: ignore[union-attr]
            Bucket=_S3_BUCKET,
            Key=key,
            Body=content,
            ContentType=content_type,
        ),
    )
    logger.debug("Uploaded image to S3: bucket=%s key=%s", _S3_BUCKET, key)

    if _CDN_BASE:
        return f"{_CDN_BASE}/{key}"
    # Fallback: construct URL from endpoint + bucket
    endpoint = (_S3_ENDPOINT or "").rstrip("/")
    return f"{endpoint}/{_S3_BUCKET}/{key}"


async def delete_image(image_path: str) -> None:
    """Delete an image by its stored path/URL. No-op on errors."""
    if not image_path:
        return

    if _USE_S3 and _s3_client is not None:
        await _delete_from_s3(image_path)
    else:
        _delete_from_disk(image_path)


def _delete_from_disk(path: str) -> None:
    if os.path.exists(path):
        try:
            os.remove(path)
            logger.debug("Deleted image from disk: %s", path)
        except Exception as exc:
            logger.warning("Could not delete image file %s: %s", path, exc)


async def _delete_from_s3(image_url: str) -> None:
    import asyncio

    # Derive key from stored URL
    key: Optional[str] = None
    if _CDN_BASE and image_url.startswith(_CDN_BASE):
        key = image_url[len(_CDN_BASE):].lstrip("/")
    elif _S3_ENDPOINT and image_url.startswith(_S3_ENDPOINT):
        # strip endpoint + bucket
        suffix = image_url[len(_S3_ENDPOINT):].lstrip("/")
        if suffix.startswith(f"{_S3_BUCKET}/"):
            key = suffix[len(_S3_BUCKET) + 1:]

    if not key:
        logger.warning("Could not derive S3 key from URL: %s", image_url)
        return

    loop = asyncio.get_event_loop()
    try:
        await loop.run_in_executor(
            None,
            lambda: _s3_client.delete_object(Bucket=_S3_BUCKET, Key=key),  # type: ignore[union-attr]
        )
        logger.debug("Deleted S3 object: %s", key)
    except Exception as exc:
        logger.warning("Could not delete S3 object %s: %s", key, exc)


# ---- Helpers ----------------------------------------------------------------

def _ext_to_mime(ext: str) -> str:
    return {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
    }.get(ext.lower(), "application/octet-stream")
