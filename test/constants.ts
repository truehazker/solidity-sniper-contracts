// Shared constants for all Sniper tests
export const PANCAKE_ROUTER_ADDRESS = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
export const PANCAKE_FACTORY_ADDRESS = "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73";
export const WETH_ADDRESS = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";
export const BUSD_ADDRESS = "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56";
export const USDC_ADDRESS = "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d";
export const USDT_ADDRESS = "0x55d398326f99059fF775485246999027B3197955";

// Error messages
export const ERROR_INVALID_PATH = "Sniper: INVALID_PATH";
export const ERROR_INVALID_TOKEN = "Sniper: INVALID_TOKEN";
export const ERROR_INVALID_AMOUNT = "Sniper: INVALID_AMOUNT";
export const ERROR_INSUFFICIENT_BALANCE = "Sniper: INSUFFICIENT_BALANCE";
export const ERROR_PANCAKE_EXPIRED = "PancakeRouter: EXPIRED";

// Test fixture for deploying the Sniper contract
export const contractFixture = async () => {
  const hre = await import("hardhat");
  const [owner, user1, user2] = await hre.ethers.getSigners();

  const Sniper = await hre.ethers.getContractFactory("Sniper");
  const sniper = await Sniper.deploy();

  return { sniper, owner, user1, user2 };
}; 