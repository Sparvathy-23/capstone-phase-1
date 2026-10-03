"""
routers/captures.py
------------------------------------------------------------------
Person 3's endpoint: receives what the mobile app already produced
in secureCapture() (hash + signature + public key + timestamp +
device id), stores it, saves the original photo bytes, and (if
blockchain is enabled) anchors the hash on-chain.

This is a single multipart/form-data endpoint rather than two
separate calls, so the app can send "here's what I hashed and
signed, and here are the exact original bytes" in one request -
there's no window where a hash is recorded but its photo never
arrives, or vice versa.
------------------------------------------------------------------
"""
import hashlib
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.blockchain import blockchain_client
from app.crypto_verify import SignatureCheckError, verify_signature
from app.database import get_db
from app.models import Capture
from app.schemas import CaptureResponse
from app.storage import save_photo

router = APIRouter(prefix="/captures", tags=["captures"])


@router.post("", response_model=CaptureResponse, status_code=status.HTTP_201_CREATED)
async def create_capture(
    hash: str = Form(..., description="hex SHA-256 the app already computed"),
    signature: str = Form(..., description="base64 signature from Android Keystore"),
    publicKey: str = Form(..., description="base64 X.509 public key"),
    timestamp: datetime = Form(..., description="ISO timestamp from secureCapture()"),
    deviceId: str = Form(...),
    photo: UploadFile = File(..., description="the exact original JPEG bytes that were hashed"),
    db: Session = Depends(get_db),
):
    hash = hash.lower().strip()

    # --- Sanity check #1: does the uploaded photo actually hash to
    # the claimed value? This catches a corrupted/re-compressed
    # upload immediately, rather than silently recording a hash that
    # doesn't correspond to the attached photo. ------------------------
    photo_bytes = await photo.read()
    actual_hash = hashlib.sha256(photo_bytes).hexdigest()
    if actual_hash != hash:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Uploaded photo does not match the claimed hash - it may have "
                "been re-compressed or altered in transit. "
                f"claimed={hash} actual={actual_hash}"
            ),
        )

    # --- Sanity check #2: is the signature actually valid for this
    # hash and public key? A bad capture shouldn't get "stored" as if
    # it were a legitimate one. --------------------------------------
    try:
        signature_ok = verify_signature(hash, signature, publicKey)
    except SignatureCheckError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    if not signature_ok:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Signature does not match this hash and public key.",
        )

    existing = db.query(Capture).filter(Capture.photo_hash == hash).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This exact photo has already been registered.",
        )

    storage_ref = save_photo(hash, photo_bytes)

    capture = Capture(
        photo_hash=hash,
        signature=signature,
        public_key=publicKey,
        device_id=deviceId,
        capture_timestamp=timestamp,
        storage_ref=storage_ref,
    )
    db.add(capture)
    db.commit()
    db.refresh(capture)

    # --- Anchor on-chain (no-op if blockchain isn't enabled yet) ------
    try:
        import base64

        tx_hash = blockchain_client.anchor_hash(
            hash_hex=hash,
            signature_b64_bytes=base64.b64decode(signature),
            public_key_b64_bytes=base64.b64decode(publicKey),
            device_id=deviceId,
            timestamp_unix=int(timestamp.replace(tzinfo=timestamp.tzinfo or timezone.utc).timestamp()),
        )
        if tx_hash:
            capture.blockchain_tx_hash = tx_hash
            capture.is_on_chain = True
            db.commit()
            db.refresh(capture)
    except Exception as exc:  # noqa: BLE001
        # Don't fail the whole request if the chain write fails - the
        # capture is still safely recorded in the DB, and can be
        # (re-)anchored later. Surface this loudly in logs though.
        print(f"[warning] blockchain anchoring failed for {hash}: {exc}")

    return capture


@router.get("/{capture_id}", response_model=CaptureResponse)
def get_capture(capture_id: str, db: Session = Depends(get_db)):
    capture = db.query(Capture).filter(Capture.id == capture_id).first()
    if not capture:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Capture not found")
    return capture


@router.get("", response_model=list[CaptureResponse])
def list_captures(db: Session = Depends(get_db), limit: int = 50):
    return db.query(Capture).order_by(Capture.created_at.desc()).limit(limit).all()
