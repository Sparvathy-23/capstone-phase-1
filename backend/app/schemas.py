"""
schemas.py
------------------------------------------------------------------
Pydantic models describing what goes in and out of each endpoint.
------------------------------------------------------------------
"""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class CaptureCreate(BaseModel):
    """What the mobile app sends right after secureCapture() finishes.
    Matches SecureCaptureResult in utils/secureCapture.ts, plus a
    device id the app generates once and re-uses."""

    hash: str = Field(..., min_length=64, max_length=64, description="hex SHA-256 of the original photo")
    signature: str = Field(..., description="base64 ECDSA signature from Android Keystore")
    publicKey: str = Field(..., description="base64 X.509 SubjectPublicKeyInfo public key")
    timestamp: datetime = Field(..., description="ISO timestamp from secureCapture()")
    deviceId: str = Field(..., description="stable per-device identifier")


class CaptureResponse(BaseModel):
    id: str
    photo_hash: str
    device_id: str
    capture_timestamp: datetime
    storage_ref: Optional[str] = None
    blockchain_tx_hash: Optional[str] = None
    is_on_chain: bool
    tier: str
    created_at: datetime

    model_config = {"from_attributes": True}


class VerifyResponse(BaseModel):
    verified: bool
    tier: Optional[str] = None
    reason: str
    computed_hash: str
    matched_capture: Optional[CaptureResponse] = None
    signature_valid: Optional[bool] = None
    on_chain: Optional[bool] = None
    blockchain_tx_hash: Optional[str] = None
