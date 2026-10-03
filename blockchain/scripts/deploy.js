const hre = require("hardhat");

async function main() {
  console.log(`Deploying HashRegistry to network: ${hre.network.name}...`);

  const HashRegistry = await hre.ethers.getContractFactory("HashRegistry");
  const registry = await HashRegistry.deploy();
  await registry.waitForDeployment();

  const address = await registry.getAddress();
  console.log("HashRegistry deployed to:", address);
  console.log("\nSave this into backend/.env as:");
  console.log(`CONTRACT_ADDRESS=${address}`);
  console.log(
    "\nIf you want to verify the source on Etherscan/Polygonscan, run:\n" +
      `npx hardhat verify --network ${hre.network.name} ${address}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
