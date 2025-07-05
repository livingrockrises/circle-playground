const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying Chirag's Life Game contract...");

  // Get the contract factory
  const ChiragsLifeGame = await ethers.getContractFactory("ChiragsLifeGame");
  
  // USDC contract address on Base Sepolia testnet
  const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
  
  // Deploy the contract
  const gameContract = await ChiragsLifeGame.deploy(USDC_ADDRESS);
  
  await gameContract.waitForDeployment();
  
  const contractAddress = await gameContract.getAddress();
  
  console.log("Chirag's Life Game deployed to:", contractAddress);
  console.log("USDC Token Address:", USDC_ADDRESS);
  
  // Verify the deployment
  console.log("\nVerifying deployment...");
  const deployedContract = await ethers.getContractAt("ChiragsLifeGame", contractAddress);
  
  const usdcToken = await deployedContract.usdcToken();
  console.log("USDC Token in contract:", usdcToken);
  
  console.log("\nDeployment successful! 🎮");
  console.log("Update the GAME_CONTRACT_ADDRESS in src/services/gameService.ts with:", contractAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 