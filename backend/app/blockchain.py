"""
blockchain.py
------------------------------------------------------------------
Person 6's responsibility: the bridge between the FastAPI backend
and the deployed HashRegistry smart contract (see blockchain/).

Two operations, matching the two places the rest of the backend
needs blockchain access:
  - anchor_hash()  -> called after POST /captures inserts a row,
                      writes hash+signature+publicKey+deviceId+
                      timestamp on-chain.
  - check_on_chain() -> called from POST /verify, reads back
                      whatever is registered for a given hash so
                      the verify endpoint can treat the chain (not
                      just the database) as the source of truth.

Everything here is a no-op (returns "not enabled") until
BLOCKCHAIN_ENABLED=true and the three required settings are filled
in backend/.env, once blockchain/ has actually been deployed. This
lets Person 3/4/5 build and test their pieces without waiting on the
contract to exist.
------------------------------------------------------------------
"""
import json
import os
from dataclasses import dataclass
from typing import Optional

from app.config import settings

_ABI_PATH = os.path.join(os.path.dirname(__file__), "contract_abi.json")


@dataclass
class OnChainRecord:
    exists: bool
    signature_hex: Optional[str] = None
    public_key_hex: Optional[str] = None
    device_id: Optional[str] = None
    timestamp: Optional[int] = None
    block_timestamp: Optional[int] = None
    registered_by: Optional[str] = None


def _load_abi():
    with open(_ABI_PATH) as f:
        return json.load(f)


class BlockchainClient:
    """Thin wrapper around web3.py - constructed once, reused per request."""

    def __init__(self):
        self.enabled = bool(
            settings.blockchain_enabled
            and settings.web3_rpc_url
            and settings.contract_address
            and settings.backend_wallet_private_key
        )
        self._w3 = None
        self._contract = None
        self._account = None

        if self.enabled:
            # Imported lazily so the rest of the app works even if
            # web3 isn't installed / configured yet.
            from web3 import Web3

            self._w3 = Web3(Web3.HTTPProvider(settings.web3_rpc_url))
            self._contract = self._w3.eth.contract(
                address=Web3.to_checksum_address(settings.contract_address),
                abi=_load_abi(),
            )
            self._account = self._w3.eth.account.from_key(settings.backend_wallet_private_key)

    def anchor_hash(
        self,
        hash_hex: str,
        signature_b64_bytes: bytes,
        public_key_b64_bytes: bytes,
        device_id: str,
        timestamp_unix: int,
    ) -> Optional[str]:
        """Writes a new record on-chain. Returns the transaction hash, or None if blockchain isn't enabled."""
        if not self.enabled:
            return None

        from web3 import Web3

        hash_bytes32 = bytes.fromhex(hash_hex)

        txn = self._contract.functions.registerHash(
            hash_bytes32,
            signature_b64_bytes,
            public_key_b64_bytes,
            device_id,
            timestamp_unix,
        ).build_transaction(
            {
                "from": self._account.address,
                "nonce": self._w3.eth.get_transaction_count(self._account.address),
            }
        )

        signed = self._account.sign_transaction(txn)
        tx_hash = self._w3.eth.send_raw_transaction(signed.raw_transaction)
        receipt = self._w3.eth.wait_for_transaction_receipt(tx_hash)
        return receipt.transactionHash.hex()

    def check_on_chain(self, hash_hex: str) -> OnChainRecord:
        """Reads back whatever is registered for this hash. Always safe to call - returns exists=False if blockchain isn't enabled or the hash was never registered."""
        if not self.enabled:
            return OnChainRecord(exists=False)

        hash_bytes32 = bytes.fromhex(hash_hex)
        (
            signature,
            public_key,
            device_id,
            timestamp,
            block_timestamp,
            registered_by,
            exists,
        ) = self._contract.functions.getRecord(hash_bytes32).call()

        if not exists:
            return OnChainRecord(exists=False)

        return OnChainRecord(
            exists=True,
            signature_hex=signature.hex(),
            public_key_hex=public_key.hex(),
            device_id=device_id,
            timestamp=timestamp,
            block_timestamp=block_timestamp,
            registered_by=registered_by,
        )


blockchain_client = BlockchainClient()
