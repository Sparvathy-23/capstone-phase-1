"""
routers/verify.py
------------------------------------------------------------------
Person 5's endpoint: this is what the web dashboard calls when
someone uploads a photo and asks "is this authentic?"

Unlike POST /captures, the backend does NOT trust anything about
this upload - it independently re-computes the hash from the raw
uploaded bytes, then checks that hash against what's on record.
------------------------------------------------------------------
"""
import hashlib

from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.orm import Session

from app.blockchain import blockchain_client
from app.crypto_verify import SignatureCheckError, verify_signature
from app.database import get_db
from app.models import Capture
from app.schemas import VerifyResponse

router = APIRouter(prefix="/verify", tags=["verify"])


@router.post("", response_model=VerifyResponse)
async def verify_photo(
    photo: UploadFile = File(..., description="the photo file to check"),
    db: Session = Depends(get_db),
):
    photo_bytes = await photo.read()
    computed_hash = hashlib.sha256(photo_bytes).hexdigest()

    capture = db.query(Capture).filter(Capture.photo_hash == computed_hash).first()

    if not capture:
        return VerifyResponse(
            verified=False,
            reason=(
                "No matching capture record found. Either this photo wasn't "
                "captured through the app, or it has been modified (even "
                "slightly - recompressed, cropped, edited, or re-saved) "
                "since the moment it was originally captured."
            ),
            computed_hash=computed_hash,
        )

    # Re-check the signature independently, rather than just trusting
    # that it was valid when it was first stored.
    try:
        signature_valid = verify_signature(computed_hash, capture.signature, capture.public_key)
    except SignatureCheckError:
        signature_valid = False

    on_chain_record = blockchain_client.check_on_chain(computed_hash)

    if not signature_valid:
        reason = (
            "Hash matches a stored capture, but its digital signature does "
            "not check out - this record may be corrupted and should not "
            "be trusted."
        )
    elif blockchain_client.enabled and not on_chain_record.exists:
        reason = (
            "Hash and signature are valid, but this capture has not yet "
            "been anchored on-chain - treat as provisionally verified "
            "pending blockchain confirmation."
        )
    else:
        reason = (
            "Verified. This exact photo matches a signed, on-device "
            "capture" + (" and its on-chain record." if blockchain_client.enabled else ".")
        )

    verified = signature_valid and (not blockchain_client.enabled or on_chain_record.exists)

    return VerifyResponse(
        verified=verified,
        tier=capture.tier.value if verified else None,
        reason=reason,
        computed_hash=computed_hash,
        matched_capture=capture,
        signature_valid=signature_valid,
        on_chain=on_chain_record.exists,
        blockchain_tx_hash=capture.blockchain_tx_hash,
    )
