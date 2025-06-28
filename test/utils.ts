import { ethers } from "hardhat";

export const getRelativeTimestamp = async (seconds: number) => {
  const block = await ethers.provider.getBlock("latest");
  if (!block) throw new Error("Failed to get current timestamp");
  return block.timestamp + seconds;
};

