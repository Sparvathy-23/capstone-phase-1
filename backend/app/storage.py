"""
storage.py
------------------------------------------------------------------
Where original photo bytes actually live once uploaded from the
mobile app. Implemented here as plain local disk storage, keyed by
the photo's own SHA-256 hash - so it's naturally content-addressed
and trivially content-safe (the filename IS the integrity check).

This is the "own backend, no Google Drive OAuth" option from your
capstone discussion - it needs no external account setup and works
the same for every teammate testing locally. If you decide you want
Drive/S3 instead later, this is the only file that needs to change -
every router just calls save_photo()/load_photo()/photo_exists().
------------------------------------------------------------------
"""
import os

from app.config import settings

os.makedirs(settings.storage_dir, exist_ok=True)


def _path_for_hash(hash_hex: str) -> str:
    return os.path.join(settings.storage_dir, f"{hash_hex}.jpg")


def save_photo(hash_hex: str, content: bytes) -> str:
    """Writes the original photo bytes to disk under its own hash. Returns the storage_ref to save in the DB."""
    path = _path_for_hash(hash_hex)
    with open(path, "wb") as f:
        f.write(content)
    return os.path.basename(path)


def load_photo(storage_ref: str) -> bytes:
    path = os.path.join(settings.storage_dir, storage_ref)
    with open(path, "rb") as f:
        return f.read()


def photo_exists(hash_hex: str) -> bool:
    return os.path.exists(_path_for_hash(hash_hex))
