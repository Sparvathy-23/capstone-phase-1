// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * HashRegistry
 * ------------------------------------------------------------------
 * Person 2's contract: the on-chain source of truth for the
 * "Verified Capture" tier of the Content Authenticity Network.
 *
 * Flow this contract supports:
 *   1. Mobile app captures a photo, computes its SHA-256 hash, and
 *      signs that hash with a device-bound Android Keystore key.
 *   2. Backend (Person 6's web3.py glue) calls registerHash() to
 *      write hash + signature + public key + device id + capture
 *      timestamp on-chain, permanently and tamper-evidently.
 *   3. Later, the backend's /verify endpoint (Person 5) re-hashes an
 *      uploaded photo and calls getRecord()/isRegistered() to check
 *      whether that exact hash was ever registered, and by whom.
 *
 * Design notes:
 *  - The hash is stored as bytes32 because SHA-256 digests are
 *    exactly 32 bytes - no encoding needed beyond hex -> bytes32.
 *  - signature and publicKey are stored as raw bytes so the contract
 *    stays agnostic to the signing algorithm (works for the
 *    ECDSA/secp256r1 signatures Android Keystore produces).
 *  - A hash can only be registered once - re-registering the same
 *    hash reverts, so the first registration is always the
 *    authoritative capture record.
 * ------------------------------------------------------------------
 */
contract HashRegistry {
    struct Record {
        bytes signature;      // digital signature over the hash (DER-encoded ECDSA, base64-decoded by the backend before sending)
        bytes publicKey;      // signer's public key (X.509 SubjectPublicKeyInfo DER, base64-decoded by the backend)
        string deviceId;      // identifier of the capturing device
        uint256 timestamp;    // capture-time timestamp, as reported by the mobile app (unix seconds)
        uint256 blockTimestamp; // chain time when this record was written
        address registeredBy; // which backend/account submitted the transaction
        bool exists;
    }

    mapping(bytes32 => Record) private records;
    bytes32[] private allHashes;

    event HashRegistered(
        bytes32 indexed hash,
        string deviceId,
        uint256 timestamp,
        address indexed registeredBy
    );

    /// @notice Registers a new capture hash on-chain. Reverts if this hash was already registered.
    function registerHash(
        bytes32 hash,
        bytes calldata signature,
        bytes calldata publicKey,
        string calldata deviceId,
        uint256 timestamp
    ) external {
        require(!records[hash].exists, "HashRegistry: hash already registered");

        records[hash] = Record({
            signature: signature,
            publicKey: publicKey,
            deviceId: deviceId,
            timestamp: timestamp,
            blockTimestamp: block.timestamp,
            registeredBy: msg.sender,
            exists: true
        });

        allHashes.push(hash);

        emit HashRegistered(hash, deviceId, timestamp, msg.sender);
    }

    /// @notice Returns the full record for a given hash. `exists` is false if it was never registered.
    function getRecord(bytes32 hash)
        external
        view
        returns (
            bytes memory signature,
            bytes memory publicKey,
            string memory deviceId,
            uint256 timestamp,
            uint256 blockTimestamp,
            address registeredBy,
            bool exists
        )
    {
        Record storage r = records[hash];
        return (
            r.signature,
            r.publicKey,
            r.deviceId,
            r.timestamp,
            r.blockTimestamp,
            r.registeredBy,
            r.exists
        );
    }

    /// @notice Cheap existence check, useful before pulling the full record.
    function isRegistered(bytes32 hash) external view returns (bool) {
        return records[hash].exists;
    }

    /// @notice Total number of hashes ever registered - handy for a dashboard stat.
    function totalRecords() external view returns (uint256) {
        return allHashes.length;
    }

    /// @notice Returns the hash at a given index, for paging through allHashes off-chain.
    function hashAt(uint256 index) external view returns (bytes32) {
        require(index < allHashes.length, "HashRegistry: index out of range");
        return allHashes[index];
    }
}
