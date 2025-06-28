import { expect } from "chai";
import hre from "hardhat";
import { ethers } from "hardhat";
import { 
  WETH_ADDRESS, 
  BUSD_ADDRESS, 
  PANCAKE_FACTORY_ADDRESS,
  ERROR_INVALID_PATH, 
  ERROR_PANCAKE_EXPIRED,
  contractFixture 
} from "./constants";
import { getRelativeTimestamp } from "./utils";

describe("Sniper - Swap and Add Liquidity Functionality", function () {
  describe("swapAndAddLiquidity", function () {
    it("Should successfully swap ETH for tokens and add liquidity", async function () {
      const { sniper, owner } = await contractFixture();

      const validPath = [
        WETH_ADDRESS, // WETH
        BUSD_ADDRESS  // BUSD token
      ];

      const amountEth = ethers.parseEther("1");
      const amountOutMin = ethers.parseEther("100");
      const liquidityPercentage = 50; // 50% of swapped tokens for liquidity
      const deadline = await getRelativeTimestamp(+60);

      // Get initial balances
      const initialContractEthBalance = await ethers.provider.getBalance(sniper.target);
      const busdToken = await ethers.getContractAt("IERC20", BUSD_ADDRESS);
      const initialTokenBalance = await busdToken.balanceOf(sniper.target);

      // Fund the contract with ETH first
      await owner.sendTransaction({
        to: sniper.target,
        value: ethers.parseEther("2")
      });

      // Perform swap and add liquidity
      const tx = await sniper.connect(owner).swapAndAddLiquidity(
        amountEth,
        amountOutMin,
        validPath,
        liquidityPercentage,
        deadline,
        { value: amountEth }
      );

      // Wait for transaction to be mined
      const receipt = await tx.wait();
      expect(receipt?.status).to.equal(1);

      // Check final balances
      const finalContractEthBalance = await ethers.provider.getBalance(sniper.target);
      const finalTokenBalance = await busdToken.balanceOf(sniper.target);

      // Contract should have received tokens from the swap
      expect(finalTokenBalance).to.be.gt(initialTokenBalance);
      // Contract ETH balance should decrease (used for swap and liquidity)
      expect(finalContractEthBalance).to.be.lt(initialContractEthBalance + ethers.parseEther("2"));
    });

    it("Should receive liquidity tokens after swap and add liquidity", async function () {
      const { sniper, owner } = await contractFixture();

      const validPath = [
        WETH_ADDRESS, // WETH
        BUSD_ADDRESS  // BUSD token
      ];

      const amountEth = ethers.parseEther("1");
      const amountOutMin = ethers.parseEther("100");
      const liquidityPercentage = 50; // 50% of swapped tokens for liquidity
      const deadline = await getRelativeTimestamp(+60);

      // Get the WETH-BUSD pair address and contract
      const factoryContract = await ethers.getContractAt("IPancakeFactory", PANCAKE_FACTORY_ADDRESS);
      const pairAddress = await factoryContract.getPair(WETH_ADDRESS, BUSD_ADDRESS);
      const pairContract = await ethers.getContractAt("IPancakePair", pairAddress);

      // Get initial LP token balance
      const initialLpBalance = await pairContract.balanceOf(sniper.target);

      // Fund the contract with ETH first
      await owner.sendTransaction({
        to: sniper.target,
        value: ethers.parseEther("2")
      });

      // Perform swap and add liquidity
      const tx = await sniper.connect(owner).swapAndAddLiquidity(
        amountEth,
        amountOutMin,
        validPath,
        liquidityPercentage,
        deadline,
        { value: amountEth }
      );

      // Wait for transaction to be mined
      const receipt = await tx.wait();
      expect(receipt?.status).to.equal(1);

      // Check final LP token balance
      const finalLpBalance = await pairContract.balanceOf(sniper.target);

      // Contract should have received LP tokens from adding liquidity
      expect(finalLpBalance).to.be.gt(initialLpBalance);
    });

    it("Should revert when path[0] is not WETH", async function () {
      const { sniper, owner } = await contractFixture();

      const invalidPath = [
        BUSD_ADDRESS, // BUSD token (not WETH)
        WETH_ADDRESS  // WETH
      ];

      const amountEth = ethers.parseEther("1");
      const amountOutMin = ethers.parseEther("100");
      const liquidityPercentage = 50;
      const deadline = await getRelativeTimestamp(+60);

      await expect(
        sniper.connect(owner).swapAndAddLiquidity(
          amountEth,
          amountOutMin,
          invalidPath,
          liquidityPercentage,
          deadline,
          { value: amountEth }
        )
      ).to.be.revertedWith(ERROR_INVALID_PATH);
    });

    it("Should revert when path length is not 2", async function () {
      const { sniper, owner } = await contractFixture();

      const invalidPath = [
        WETH_ADDRESS, // WETH
        BUSD_ADDRESS, // BUSD token
        WETH_ADDRESS  // WETH again (3 tokens)
      ];

      const amountEth = ethers.parseEther("1");
      const amountOutMin = ethers.parseEther("100");
      const liquidityPercentage = 50;
      const deadline = await getRelativeTimestamp(+60);

      await expect(
        sniper.connect(owner).swapAndAddLiquidity(
          amountEth,
          amountOutMin,
          invalidPath,
          liquidityPercentage,
          deadline,
          { value: amountEth }
        )
      ).to.be.revertedWith("Sniper: SINGLE_HOP_ONLY");
    });

    it("Should revert when liquidity percentage is invalid", async function () {
      const { sniper, owner } = await contractFixture();

      const validPath = [
        WETH_ADDRESS, // WETH
        BUSD_ADDRESS  // BUSD token
      ];

      const amountEth = ethers.parseEther("1");
      const amountOutMin = ethers.parseEther("100");
      const invalidLiquidityPercentage = 101; // Greater than 100%
      const deadline = await getRelativeTimestamp(+60);

      await expect(
        sniper.connect(owner).swapAndAddLiquidity(
          amountEth,
          amountOutMin,
          validPath,
          invalidLiquidityPercentage,
          deadline,
          { value: amountEth }
        )
      ).to.be.revertedWith("Sniper: INVALID_LIQUIDITY_PERCENTAGE");
    });

    it("Should revert when deadline has passed", async function () {
      const { sniper, owner } = await contractFixture();

      const validPath = [
        WETH_ADDRESS, // WETH
        BUSD_ADDRESS  // BUSD token
      ];

      const amountEth = ethers.parseEther("1");
      const amountOutMin = ethers.parseEther("100");
      const liquidityPercentage = 50;
      const deadline = await getRelativeTimestamp(-10); // Past deadline

      await expect(
        sniper.connect(owner).swapAndAddLiquidity(
          amountEth,
          amountOutMin,
          validPath,
          liquidityPercentage,
          deadline,
          { value: amountEth }
        )
      ).to.be.revertedWith(ERROR_PANCAKE_EXPIRED);
    });
  });
}); 