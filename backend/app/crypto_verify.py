"""
crypto_verify.py
------------------------------------------------------------------
Person 4's responsibility: given a hash, a signature, and a public
key, cryptographically confirm the signature was genuinely produced
by that key's matching private key, over that exact hash.

This does NOT generate anything - the mobile app already did that
in modules/secure-keystore (SecureKeystoreModule.kt). This is purely
a *check*.

Why the specific algorithm choice below matters
------------------------------------------------
The Android Keystore module signs like this (see
SecureKeystoreModule.kt):

    KeyPairGenerator: EC, curve secp256r1 (a.k.a. P-256)
    Signature.getInstance("NONEwithECDSA")
    signature.update(hashBytes)   <- the ALREADY-COMPUTED SHA-256 digest
    signature.sign()              <- returns a DER-encoded ECDSA signature

"NONEwithECDSA" means Java does NOT hash the input again - it signs
the 32 raw digest bytes directly. The Python `cryptography` library's
equivalent is ECDSA with a Prehashed(SHA256()) algorithm: you pass in
the already-computed digest, and it treats it as pre-hashed instead
of hashing it again.

The public key Android hands back (`keyStore.getCertificate(...).
publicKey.encoded`) is X.509 SubjectPublicKeyInfo DER - exactly what
`cryptography`'s `load_der_public_key` expects.

The signature Java's `Signature.sign()` returns is ASN.1/DER-encoded
(r, s) - exactly the format `cryptography`'s EC `verify()` expects by
default. No extra decoding needed on either side.
------------------------------------------------------------------
"""
import base64
import binascii

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import ec, utils
from cryptography.hazmat.primitives.serialization import load_der_public_key


class SignatureCheckError(Exception):
    """Raised when the inputs themselves are malformed (not just an invalid signature)."""


def verify_signature(hash_hex: str, signature_b64: str, public_key_b64: str) -> bool:
    """
    Returns True if `signature_b64` is a valid ECDSA signature, by the
    key encoded in `public_key_b64`, over the digest `hash_hex`.
    Returns False if the signature simply doesn't check out.
    Raises SignatureCheckError if the inputs can't even be parsed
    (e.g. not valid base64/hex, or not an EC key).
    """
    try:
        digest_bytes = bytes.fromhex(hash_hex)
    except ValueError as exc:
        raise SignatureCheckError(f"hash is not valid hex: {exc}") from exc

    if len(digest_bytes) != 32:
        raise SignatureCheckError(
            f"expected a 32-byte SHA-256 digest, got {len(digest_bytes)} bytes"
        )

    try:
        signature_bytes = base64.b64decode(signature_b64, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise SignatureCheckError(f"signature is not valid base64: {exc}") from exc

    try:
        public_key_bytes = base64.b64decode(public_key_b64, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise SignatureCheckError(f"public key is not valid base64: {exc}") from exc

    try:
        public_key = load_der_public_key(public_key_bytes)
    except Exception as exc:  # noqa: BLE001 - re-raise as our own error type
        raise SignatureCheckError(f"public key is not valid X.509 DER: {exc}") from exc

    if not isinstance(public_key, ec.EllipticCurvePublicKey):
        raise SignatureCheckError("public key is not an EC (elliptic curve) key")

    try:
        public_key.verify(
            signature_bytes,
            digest_bytes,
            ec.ECDSA(utils.Prehashed(hashes.SHA256())),
        )
        return True
    except InvalidSignature:
        return False
