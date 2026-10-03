const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("HashRegistry", function () {
  let registry;
  let owner, other;

  const sampleHashHex =
    "0x" + "ab".repeat(32); // fake 32-byte SHA-256 hash for testing
  const sampleSignature = "0x1234abcd";
  const samplePublicKey = "0x4321dcba";
  const sampleDeviceId = "device-test-001";
  const sampleTimestamp = Math.floor(Date.now() / 1000);

  beforeEach(async function () {
    [owner, other] = await ethers.getSigners();
    const HashRegistry = await ethers.getContractFactory("HashRegistry");
    registry = await HashRegistry.deploy();
    await registry.waitForDeployment();
  });

  it("registers a new hash and emits HashRegistered", async function () {
    await expect(
      registry.registerHash(
        sampleHashHex,
        sampleSignature,
        samplePublicKey,
        sampleDeviceId,
        sampleTimestamp
      )
    )
      .to.emit(registry, "HashRegistered")
      .withArgs(sampleHashHex, sampleDeviceId, sampleTimestamp, owner.address);

    expect(await registry.isRegistered(sampleHashHex)).to.equal(true);
    expect(await registry.totalRecords()).to.equal(1n);
  });

  it("returns the full record via getRecord", async function () {
    await registry.registerHash(
      sampleHashHex,
      sampleSignature,
      samplePublicKey,
      sampleDeviceId,
      sampleTimestamp
    );

    const record = await registry.getRecord(sampleHashHex);
    expect(record.signature).to.equal(sampleSignature);
    expect(record.publicKey).to.equal(samplePublicKey);
    expect(record.deviceId).to.equal(sampleDeviceId);
    expect(record.timestamp).to.equal(BigInt(sampleTimestamp));
    expect(record.exists).to.equal(true);
  });

  it("reverts when the same hash is registered twice", async function () {
    await registry.registerHash(
      sampleHashHex,
      sampleSignature,
      samplePublicKey,
      sampleDeviceId,
      sampleTimestamp
    );

    await expect(
      registry
        .connect(other)
        .registerHash(
          sampleHashHex,
          sampleSignature,
          samplePublicKey,
          sampleDeviceId,
          sampleTimestamp
        )
    ).to.be.revertedWith("HashRegistry: hash already registered");
  });

  it("reports isRegistered = false and exists = false for an unknown hash", async function () {
    const unknownHash = "0x" + "00".repeat(32);
    expect(await registry.isRegistered(unknownHash)).to.equal(false);

    const record = await registry.getRecord(unknownHash);
    expect(record.exists).to.equal(false);
  });
});
