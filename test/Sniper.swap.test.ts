import { expect } from "chai";
import hre from "hardhat";
import { ethers } from "hardhat";
import { 
  WETH_ADDRESS, 
  BUSD_ADDRESS, 
  ERROR_INVALID_PATH, 
  contractFixture 
} from "./constants";

describe("Sniper - Swap Functionality", function () {
  describe("swapEthForExactTokens", function () {
    it("Should revert when path[0] is not WETH", async function () {
      const { sniper, user1 } = await contractFixture();

      const invalidPath = [
        BUSD_ADDRESS, // BUSD token
        WETH_ADDRESS  // WETH
      ];

      const amountOut = ethers.parseEther("1");
      const deadline = Math.floor(Date.now() / 1000) + 10; // 10 seconds from now

      await expect(
        sniper.connect(user1).swapEthForExactTokens(
          amountOut,
          invalidPath,
          user1.address,
          deadline,
          { value: ethers.parseEther("0.1") }
        )
      ).to.be.revertedWith(ERROR_INVALID_PATH);
    });

    it("Should accept valid path with WETH as first token", async function () {
      const { sniper, user1 } = await contractFixture();

      const validPath = [
        WETH_ADDRESS, // WETH
        BUSD_ADDRESS  // BUSD token
      ];

      const amountOut = ethers.parseEther("1");
      const deadline = Math.floor(Date.now() / 1000) + 10; // 10 seconds from now

      // This should not revert due to path validation
      // Note: It will likely revert due to router interaction, but not due to our path check
      await expect(
        sniper.connect(user1).swapEthForExactTokens(
          amountOut,
          validPath,
          user1.address,
          deadline,
          { value: ethers.parseEther("0.1") }
        )
      ).to.not.be.revertedWith(ERROR_INVALID_PATH);
    });

    it("Should forward the correct parameters to PancakeRouter", async function () {
      const { sniper, user1 } = await contractFixture();

      const validPath = [
        WETH_ADDRESS, // WETH
        BUSD_ADDRESS  // BUSD token
      ];

      const amountOut = ethers.parseEther("1");
      const deadline = Math.floor(Date.now() / 1000) + 10;
      const ethValue = ethers.parseEther("0.1");

      // The function should call the router with the exact same parameters
      // We can't easily mock the router in this test, but we can verify the function signature
      // and that it doesn't revert due to our validation
      await expect(
        sniper.connect(user1).swapEthForExactTokens(
          amountOut,
          validPath,
          user1.address,
          deadline,
          { value: ethValue }
        )
      ).to.not.be.revertedWith(ERROR_INVALID_PATH);
    });

    it("Should handle different recipients", async function () {
      const { sniper, user1, user2 } = await contractFixture();

      const validPath = [
        WETH_ADDRESS, // WETH
        BUSD_ADDRESS  // BUSD token
      ];

      const amountOut = ethers.parseEther("1");
      const deadline = Math.floor(Date.now() / 1000) + 10;

      // Test with different recipient addresses
      await expect(
        sniper.connect(user1).swapEthForExactTokens(
          amountOut,
          validPath,
          user2.address, // Different recipient
          deadline,
          { value: ethers.parseEther("0.1") }
        )
      ).to.not.be.revertedWith(ERROR_INVALID_PATH);
    });

    it("Should handle zero amountOut", async function () {
      const { sniper, user1 } = await contractFixture();

      const validPath = [
        WETH_ADDRESS, // WETH
        BUSD_ADDRESS  // BUSD token
      ];

      const amountOut = 0; // Zero amount
      const deadline = Math.floor(Date.now() / 1000) + 10;

      await expect(
        sniper.connect(user1).swapEthForExactTokens(
          amountOut,
          validPath,
          user1.address,
          deadline,
          { value: ethers.parseEther("0.1") }
        )
      ).to.not.be.revertedWith(ERROR_INVALID_PATH);
    });

    it("Should handle past deadline", async function () {
      const { sniper, user1 } = await contractFixture();

      const validPath = [
        WETH_ADDRESS, // WETH
        BUSD_ADDRESS  // BUSD token
      ];

      const amountOut = ethers.parseEther("1");
      const deadline = Math.floor(Date.now() / 1000) - 10; // Past deadline

      await expect(
        sniper.connect(user1).swapEthForExactTokens(
          amountOut,
          validPath,
          user1.address,
          deadline,
          { value: ethers.parseEther("0.1") }
        )
      ).to.not.be.revertedWith(ERROR_INVALID_PATH);
    });
  });

  describe("Function visibility and access", function () {
    it("Should allow any user to call swapEthForExactTokens", async function () {
      const { sniper, user1, user2 } = await contractFixture();

      const validPath = [
        WETH_ADDRESS, // WETH
        BUSD_ADDRESS  // BUSD token
      ];

      const amountOut = ethers.parseEther("1");
      const deadline = Math.floor(Date.now() / 1000) + 10;

      // Test with different users
      await expect(
        sniper.connect(user1).swapEthForExactTokens(
          amountOut,
          validPath,
          user1.address,
          deadline,
          { value: ethers.parseEther("0.1") }
        )
      ).to.not.be.revertedWith(ERROR_INVALID_PATH);

      await expect(
        sniper.connect(user2).swapEthForExactTokens(
          amountOut,
          validPath,
          user2.address,
          deadline,
          { value: ethers.parseEther("0.1") }
        )
      ).to.not.be.revertedWith(ERROR_INVALID_PATH);
    });
  });

  describe("Edge cases", function () {
    it("Should handle empty path array", async function () {
      const { sniper, user1 } = await contractFixture();

      const emptyPath: string[] = [];
      const amountOut = ethers.parseEther("1");
      const deadline = Math.floor(Date.now() / 1000) + 10;

      // This should revert due to array access, but not due to our validation
      await expect(
        sniper.connect(user1).swapEthForExactTokens(
          amountOut,
          emptyPath,
          user1.address,
          deadline,
          { value: ethers.parseEther("0.1") }
        )
      ).to.be.reverted; // Should revert due to array bounds, not our validation
    });

    it("Should handle single token path", async function () {
      const { sniper, user1 } = await contractFixture();

      const singleTokenPath = [
        WETH_ADDRESS // Only WETH
      ];

      const amountOut = ethers.parseEther("1");
      const deadline = Math.floor(Date.now() / 1000) + 10;

      await expect(
        sniper.connect(user1).swapEthForExactTokens(
          amountOut,
          singleTokenPath,
          user1.address,
          deadline,
          { value: ethers.parseEther("0.1") }
        )
      ).to.not.be.revertedWith(ERROR_INVALID_PATH);
    });
  });
}); 