"""
models.py
------------------------------------------------------------------
Person 3's table design: one row per secured capture. This is the
record created the moment the mobile app finishes secureCapture()
and calls POST /captures - long before anyone tries to verify
anything.
------------------------------------------------------------------
"""
import enum
import uuid

from sqlalchemy import Column, String, Integer, DateTime, Enum, Boolean, func
from sqlalchemy.dialects.sqlite import CHAR

from app.database import Base


class CaptureTier(str, enum.Enum):
    verified_capture = "verified_capture"  # signed on-device + anchored on-chain
    ai_assessed = "ai_assessed"            # not from this app - Phase 2's deepfake/LLM path


def generate_id() -> str:
    return str(uuid.uuid4())


class Capture(Base):
    __tablename__ = "captures"

    id = Column(CHAR(36), primary_key=True, default=generate_id)

    # --- What the mobile app already computed (secureCapture()) ------
    photo_hash = Column(String(64), unique=True, index=True, nullable=False)  # hex SHA-256, 64 chars
    signature = Column(String, nullable=False)     # base64, as produced by Android Keystore
    public_key = Column(String, nullable=False)    # base64 X.509 SubjectPublicKeyInfo
    device_id = Column(String, nullable=False)
    capture_timestamp = Column(DateTime(timezone=True), nullable=False)  # from the app, when the photo was secured

    # --- Where the original photo bytes live --------------------------
    # filename under storage_dir/ - see app/storage.py. Left nullable so
    # a capture can be recorded even before the photo upload completes.
    storage_ref = Column(String, nullable=True)

    # --- Blockchain anchoring status ----------------------------------
    blockchain_tx_hash = Column(String, nullable=True)
    is_on_chain = Column(Boolean, default=False, nullable=False)

    tier = Column(Enum(CaptureTier), default=CaptureTier.verified_capture, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
