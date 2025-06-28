import { expect } from "chai";
import hre from "hardhat";
import { ethers } from "hardhat";
import { 
  WETH_ADDRESS, 
  BUSD_ADDRESS, 
  ERROR_INVALID_PATH, 
  contractFixture 
} from "./constants";
import { getRelativeTimestamp } from "./utils";

describe("Sniper - Swap Functionality", function () {
  describe("swapEthForExactTokens", function () {
    it("Should revert when path[0] is not WETH", async function () {
      const { sniper, owner } = await contractFixture();

      // Fund the contract with ETH first
      await owner.sendTransaction({
        to: sniper.target,
        value: ethers.parseEther("1")
      });

      const invalidPath = [
        BUSD_ADDRESS, // BUSD token
        WETH_ADDRESS  // WETH
      ];

      const amountEth = ethers.parseEther("0.1");
      const amountOutMin = ethers.parseEther("1");
      const deadline = await getRelativeTimestamp(+10); // 10 seconds from now

      await expect(
        sniper.connect(owner).swapEthForExactTokens(
          amountEth,
          amountOutMin,
          invalidPath,
          deadline
        )
      ).to.be.revertedWith(ERROR_INVALID_PATH);
    });

    it("Should accept valid path with WETH as first token", async function () {
      const { sniper, owner } = await contractFixture();

      // Fund the contract with ETH first
      await owner.sendTransaction({
        to: sniper.target,
        value: ethers.parseEther("1")
      });

      const validPath = [
        WETH_ADDRESS, // WETH
        BUSD_ADDRESS  // BUSD token
      ];

      const amountEth = ethers.parseEther("0.1");
      const amountOutMin = ethers.parseEther("1");
      const deadline = await getRelativeTimestamp(+10); // 10 seconds from now

      // This should not revert due to path validation
      await expect(
        sniper.connect(owner).swapEthForExactTokens(
          amountEth,
          amountOutMin,
          validPath,
          deadline
        )
      ).to.not.be.reverted;
    });

    it("Should handle zero amountOutMin", async function () {
      const { sniper, owner } = await contractFixture();

      // Fund the contract with ETH first
      await owner.sendTransaction({
        to: sniper.target,
        value: ethers.parseEther("1")
      });

      const validPath = [
        WETH_ADDRESS, // WETH
        BUSD_ADDRESS  // BUSD token
      ];

      const amountEth = ethers.parseEther("0.1");
      const amountOutMin = 0; // Zero minimum amount out
      const deadline = await getRelativeTimestamp(+10);

      await expect(
        sniper.connect(owner).swapEthForExactTokens(
          amountEth,
          amountOutMin,
          validPath,
          deadline
        )
      ).to.not.be.reverted;
    });

    it("Should handle past deadline", async function () {
      const { sniper, owner } = await contractFixture();

      // Fund the contract with ETH first
      await owner.sendTransaction({
        to: sniper.target,
        value: ethers.parseEther("1")
      });

      const validPath = [
        WETH_ADDRESS, // WETH
        BUSD_ADDRESS  // BUSD token
      ];

      const amountEth = ethers.parseEther("0.1");
      const amountOutMin = ethers.parseEther("1");
      const deadline = await getRelativeTimestamp(-10); // Past deadline

      await expect(
        sniper.connect(owner).swapEthForExactTokens(
          amountEth,
          amountOutMin,
          validPath,
          deadline
        )
      ).to.be.revertedWith("PancakeRouter: EXPIRED");
    });
  });

  describe("Function visibility and access", function () {
    it("Should only allow owner to call swapEthForExactTokens", async function () {
      const { sniper, owner, user1, user2 } = await contractFixture();

      // Fund the contract with ETH first
      await owner.sendTransaction({
        to: sniper.target,
        value: ethers.parseEther("1")
      });

      const validPath = [
        WETH_ADDRESS, // WETH
        BUSD_ADDRESS  // BUSD token
      ];

      const amountEth = ethers.parseEther("0.1");
      const amountOutMin = ethers.parseEther("1");
      const deadline = await getRelativeTimestamp(+10);

      // Owner should be able to call
      await expect(
        sniper.connect(owner).swapEthForExactTokens(
          amountEth,
          amountOutMin,
          validPath,
          deadline
        )
      ).to.not.be.reverted;

      // Non-owners should not be able to call
      await expect(
        sniper.connect(user1).swapEthForExactTokens(
          amountEth,
          amountOutMin,
          validPath,
          deadline
        )
      ).to.be.revertedWithCustomError(sniper, "OwnableUnauthorizedAccount");

      await expect(
        sniper.connect(user2).swapEthForExactTokens(
          amountEth,
          amountOutMin,
          validPath,
          deadline
        )
      ).to.be.revertedWithCustomError(sniper, "OwnableUnauthorizedAccount");
    });
  });

  describe("Edge cases", function () {
    it("Should handle empty path array", async function () {
      const { sniper, owner } = await contractFixture();

      // Fund the contract with ETH first
      await owner.sendTransaction({
        to: sniper.target,
        value: ethers.parseEther("1")
      });

      const emptyPath: string[] = [];
      const amountEth = ethers.parseEther("0.1");
      const amountOutMin = ethers.parseEther("1");
      const deadline = await getRelativeTimestamp(+10);

      // This should revert due to array access, but not due to our validation
      await expect(
        sniper.connect(owner).swapEthForExactTokens(
          amountEth,
          amountOutMin,
          emptyPath,
          deadline
        )
      ).to.be.reverted; // Should revert due to array bounds, not our validation
    });

    it("Should handle single token path", async function () {
      const { sniper, owner } = await contractFixture();

      // Fund the contract with ETH first
      await owner.sendTransaction({
        to: sniper.target,
        value: ethers.parseEther("1")
      });

      const singleTokenPath = [
        WETH_ADDRESS // Only WETH
      ];

      const amountEth = ethers.parseEther("0.1");
      const amountOutMin = ethers.parseEther("1");
      const deadline = await getRelativeTimestamp(+10);

      await expect(
        sniper.connect(owner).swapEthForExactTokens(
          amountEth,
          amountOutMin,
          singleTokenPath,
          deadline
        )
      ).to.not.be.revertedWith(ERROR_INVALID_PATH);
    });
  });

  describe("Balance verification", function () {
    it("Should decrease contract ETH balance after swap", async function () {
      const { sniper, owner } = await contractFixture();

      const validPath = [
        WETH_ADDRESS, // WETH
        BUSD_ADDRESS  // BUSD token
      ];

      const amountEth = ethers.parseEther("0.1");
      const amountOutMin = ethers.parseEther("1");
      const deadline = await getRelativeTimestamp(+10);
      const initialEthAmount = ethers.parseEther("1");

      // Fund the contract with ETH first
      await owner.sendTransaction({
        to: sniper.target,
        value: initialEthAmount
      });

      // Get initial contract ETH balance
      const initialContractBalance = await ethers.provider.getBalance(sniper.target);

      // Perform swap
      await sniper.connect(owner).swapEthForExactTokens(
        amountEth,
        amountOutMin,
        validPath,
        deadline
      );

      // Check final contract ETH balance
      const finalContractBalance = await ethers.provider.getBalance(sniper.target);

      // Contract ETH balance should decrease by the amount used for swap
      expect(finalContractBalance).to.equal(initialContractBalance - amountEth);
    });

    it("Should increase contract token balance after swap", async function () {
      const { sniper, owner } = await contractFixture();

      const validPath = [
        WETH_ADDRESS, // WETH
        BUSD_ADDRESS  // BUSD token
      ];

      const amountEth = ethers.parseEther("0.1");
      const amountOutMin = ethers.parseEther("1");
      const deadline = await getRelativeTimestamp(+10);
      const initialEthAmount = ethers.parseEther("1");

      // Fund the contract with ETH first
      await owner.sendTransaction({
        to: sniper.target,
        value: initialEthAmount
      });

      // Get initial contract token balance
      const busdToken = await ethers.getContractAt("IERC20", BUSD_ADDRESS);
      const initialTokenBalance = await busdToken.balanceOf(sniper.target);

      // Perform swap
      await sniper.connect(owner).swapEthForExactTokens(
        amountEth,
        amountOutMin,
        validPath,
        deadline
      );

      // Check final contract token balance
      const finalTokenBalance = await busdToken.balanceOf(sniper.target);

      // Contract token balance should increase
      expect(finalTokenBalance).to.be.gt(initialTokenBalance);
    });

    it("Should handle zero amountOutMin correctly", async function () {
      const { sniper, owner } = await contractFixture();

      const validPath = [
        WETH_ADDRESS, // WETH
        BUSD_ADDRESS  // BUSD token
      ];

      const amountEth = ethers.parseEther("0.1");
      const amountOutMin = 0; // Zero minimum amount out
      const deadline = await getRelativeTimestamp(+10);
      const initialEthAmount = ethers.parseEther("1");

      // Fund the contract with ETH first
      await owner.sendTransaction({
        to: sniper.target,
        value: initialEthAmount
      });

      // Get initial balances
      const busdToken = await ethers.getContractAt("IERC20", BUSD_ADDRESS);
      const initialTokenBalance = await busdToken.balanceOf(sniper.target);
      const initialContractBalance = await ethers.provider.getBalance(sniper.target);

      // Perform swap with zero amountOutMin
      await sniper.connect(owner).swapEthForExactTokens(
        amountEth,
        amountOutMin,
        validPath,
        deadline
      );

      // Check final balances
      const finalTokenBalance = await busdToken.balanceOf(sniper.target);
      const finalContractBalance = await ethers.provider.getBalance(sniper.target);

      // Token balance should increase (ETH is still swapped for tokens)
      // amountOutMin = 0 means no minimum, but ETH is still converted
      expect(finalTokenBalance).to.be.gt(initialTokenBalance);
      // Contract ETH balance should decrease
      expect(finalContractBalance).to.equal(initialContractBalance - amountEth);
    });

    it("Should revert when contract has insufficient ETH", async function () {
      const { sniper, owner } = await contractFixture();

      const validPath = [
        WETH_ADDRESS, // WETH
        BUSD_ADDRESS  // BUSD token
      ];

      const amountEth = ethers.parseEther("1"); // More than contract has
      const amountOutMin = ethers.parseEther("1");
      const deadline = await getRelativeTimestamp(+10);

      // Don't fund the contract with ETH

      // This should revert due to insufficient ETH
      await expect(
        sniper.connect(owner).swapEthForExactTokens(
          amountEth,
          amountOutMin,
          validPath,
          deadline
        )
      ).to.be.reverted; // Should revert due to insufficient ETH
    });
  });
}); 