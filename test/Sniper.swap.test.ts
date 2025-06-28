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

  describe("Balance verification", function () {
    it("Should decrease ETH balance and increase token balance after swap", async function () {
      const { sniper, user1 } = await contractFixture();

      const validPath = [
        WETH_ADDRESS, // WETH
        BUSD_ADDRESS  // BUSD token
      ];

      const amountOut = ethers.parseEther("1");
      const deadline = Math.floor(Date.now() / 1000) + 10;
      const ethAmount = ethers.parseEther("0.1");

      // Get initial balances
      const initialEthBalance = await ethers.provider.getBalance(user1.address);
      const busdToken = await ethers.getContractAt("IERC20", BUSD_ADDRESS);
      const initialTokenBalance = await busdToken.balanceOf(user1.address);

      // Perform swap
      await sniper.connect(user1).swapEthForExactTokens(
        amountOut,
        validPath,
        user1.address,
        deadline,
        { value: ethAmount }
      );

      // Check final balances
      const finalEthBalance = await ethers.provider.getBalance(user1.address);
      const finalTokenBalance = await busdToken.balanceOf(user1.address);

      // ETH balance should decrease (accounting for gas fees)
      expect(finalEthBalance).to.be.lt(initialEthBalance);
      // Token balance should increase
      expect(finalTokenBalance).to.be.gt(initialTokenBalance);
    });

    it("Should transfer tokens to different recipient", async function () {
      const { sniper, user1, user2 } = await contractFixture();

      const validPath = [
        WETH_ADDRESS, // WETH
        BUSD_ADDRESS  // BUSD token
      ];

      const amountOut = ethers.parseEther("1");
      const deadline = Math.floor(Date.now() / 1000) + 10;
      const ethAmount = ethers.parseEther("0.1");

      // Get initial balances
      const busdToken = await ethers.getContractAt("IERC20", BUSD_ADDRESS);
      const initialUser1TokenBalance = await busdToken.balanceOf(user1.address);
      const initialUser2TokenBalance = await busdToken.balanceOf(user2.address);

      // Perform swap to user2
      await sniper.connect(user1).swapEthForExactTokens(
        amountOut,
        validPath,
        user2.address, // Recipient is user2
        deadline,
        { value: ethAmount }
      );

      // Check final balances
      const finalUser1TokenBalance = await busdToken.balanceOf(user1.address);
      const finalUser2TokenBalance = await busdToken.balanceOf(user2.address);

      // User1 token balance should remain the same (they sent ETH, not tokens)
      expect(finalUser1TokenBalance).to.equal(initialUser1TokenBalance);
      // User2 token balance should increase
      expect(finalUser2TokenBalance).to.be.gt(initialUser2TokenBalance);
    });

    it("Should handle zero amountOut correctly", async function () {
      const { sniper, user1 } = await contractFixture();

      const validPath = [
        WETH_ADDRESS, // WETH
        BUSD_ADDRESS  // BUSD token
      ];

      const amountOut = 0; // Zero minimum amount out
      const deadline = Math.floor(Date.now() / 1000) + 10;
      const ethAmount = ethers.parseEther("0.1");

      // Get initial balances
      const busdToken = await ethers.getContractAt("IERC20", BUSD_ADDRESS);
      const initialTokenBalance = await busdToken.balanceOf(user1.address);

      // Perform swap with zero amountOut
      await sniper.connect(user1).swapEthForExactTokens(
        amountOut,
        validPath,
        user1.address,
        deadline,
        { value: ethAmount }
      );

      // Check final balance
      const finalTokenBalance = await busdToken.balanceOf(user1.address);

      // Token balance should increase (ETH is still swapped for tokens)
      // amountOut = 0 means no minimum, but ETH is still converted
      expect(finalTokenBalance).to.be.gt(initialTokenBalance);
    });
  });
}); 