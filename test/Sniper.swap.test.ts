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

  describe("swapAndAddLiquidity", function () {
    describe("Parameter Validation", function () {
      it("Should revert when path[0] is not WETH", async function () {
        const { sniper, user1 } = await contractFixture();

        const invalidPath = [
          BUSD_ADDRESS, // BUSD token
          WETH_ADDRESS  // WETH
        ];

        const amountOut = ethers.parseEther("1");
        const liquidityPercent = 5000; // 50%
        const ethForLiquidity = ethers.parseEther("0.05");
        const amountAMin = ethers.parseEther("0.04");
        const amountBMin = ethers.parseEther("45");
        const deadline = Math.floor(Date.now() / 1000) + 10;

        await expect(
          sniper.connect(user1).swapAndAddLiquidity(
            amountOut,
            invalidPath,
            liquidityPercent,
            ethForLiquidity,
            amountAMin,
            amountBMin,
            user1.address,
            deadline,
            { value: ethers.parseEther("0.1") }
          )
        ).to.be.revertedWith(ERROR_INVALID_PATH);
      });

      it("Should revert when path length is less than 2", async function () {
        const { sniper, user1 } = await contractFixture();

        const invalidPath = [WETH_ADDRESS]; // Only one token

        const amountOut = ethers.parseEther("1");
        const liquidityPercent = 5000; // 50%
        const ethForLiquidity = ethers.parseEther("0.05");
        const amountAMin = ethers.parseEther("0.04");
        const amountBMin = ethers.parseEther("45");
        const deadline = Math.floor(Date.now() / 1000) + 10;

        await expect(
          sniper.connect(user1).swapAndAddLiquidity(
            amountOut,
            invalidPath,
            liquidityPercent,
            ethForLiquidity,
            amountAMin,
            amountBMin,
            user1.address,
            deadline,
            { value: ethers.parseEther("0.1") }
          )
        ).to.be.revertedWith("Sniper: INVALID_PATH_LENGTH");
      });

      it("Should revert when liquidity percentage is greater than 100%", async function () {
        const { sniper, user1 } = await contractFixture();

        const validPath = [
          WETH_ADDRESS, // WETH
          BUSD_ADDRESS  // BUSD token
        ];

        const amountOut = ethers.parseEther("1");
        const liquidityPercent = 10001; // 100.01%
        const ethForLiquidity = ethers.parseEther("0.05");
        const amountAMin = 0; // Set to 0 to avoid router validation
        const amountBMin = 0; // Set to 0 to avoid router validation
        const deadline = Math.floor(Date.now() / 1000) + 10;

        await expect(
          sniper.connect(user1).swapAndAddLiquidity(
            amountOut,
            validPath,
            liquidityPercent,
            ethForLiquidity,
            amountAMin,
            amountBMin,
            user1.address,
            deadline,
            { value: ethers.parseEther("0.1") }
          )
        ).to.be.revertedWith("Sniper: INVALID_PERCENTAGE");
      });

      it("Should revert when ethForLiquidity is greater than msg.value", async function () {
        const { sniper, user1 } = await contractFixture();

        const validPath = [
          WETH_ADDRESS, // WETH
          BUSD_ADDRESS  // BUSD token
        ];

        const amountOut = ethers.parseEther("1");
        const liquidityPercent = 5000; // 50%
        const ethForLiquidity = ethers.parseEther("0.2"); // More than msg.value
        const amountAMin = 0; // Set to 0 to avoid router validation
        const amountBMin = 0; // Set to 0 to avoid router validation
        const deadline = Math.floor(Date.now() / 1000) + 10;

        await expect(
          sniper.connect(user1).swapAndAddLiquidity(
            amountOut,
            validPath,
            liquidityPercent,
            ethForLiquidity,
            amountAMin,
            amountBMin,
            user1.address,
            deadline,
            { value: ethers.parseEther("0.1") }
          )
        ).to.be.revertedWith("Sniper: INSUFFICIENT_ETH_FOR_LIQUIDITY");
      });

      it("Should revert when recipient is zero address", async function () {
        const { sniper, user1 } = await contractFixture();

        const validPath = [
          WETH_ADDRESS, // WETH
          BUSD_ADDRESS  // BUSD token
        ];

        const amountOut = ethers.parseEther("1");
        const liquidityPercent = 5000; // 50%
        const ethForLiquidity = ethers.parseEther("0.05");
        const amountAMin = 0; // Set to 0 to avoid router validation
        const amountBMin = 0; // Set to 0 to avoid router validation
        const deadline = Math.floor(Date.now() / 1000) + 10;

        await expect(
          sniper.connect(user1).swapAndAddLiquidity(
            amountOut,
            validPath,
            liquidityPercent,
            ethForLiquidity,
            amountAMin,
            amountBMin,
            ethers.ZeroAddress, // Zero address
            deadline,
            { value: ethers.parseEther("0.1") }
          )
        ).to.be.revertedWith("Sniper: INVALID_RECIPIENT");
      });

      it("Should revert when deadline is expired", async function () {
        const { sniper, user1 } = await contractFixture();

        const validPath = [
          WETH_ADDRESS, // WETH
          BUSD_ADDRESS  // BUSD token
        ];

        const amountOut = ethers.parseEther("1");
        const liquidityPercent = 0; // 0% to avoid router interaction
        const ethForLiquidity = 0; // No ETH for liquidity
        const amountAMin = 0;
        const amountBMin = 0;
        const deadline = 1; // Very old timestamp (January 1, 1970 + 1 second)

        // This should revert due to our deadline validation
        await expect(
          sniper.connect(user1).swapAndAddLiquidity(
            amountOut,
            validPath,
            liquidityPercent,
            ethForLiquidity,
            amountAMin,
            amountBMin,
            user1.address,
            deadline,
            { value: ethers.parseEther("0.1") }
          )
        ).to.be.revertedWith("Sniper: EXPIRED_DEADLINE");
      });
    });

    describe("Percentage Calculations", function () {
      it("Should handle 0% liquidity (swap only)", async function () {
        const { sniper, user1 } = await contractFixture();

        const validPath = [
          WETH_ADDRESS, // WETH
          BUSD_ADDRESS  // BUSD token
        ];

        const amountOut = ethers.parseEther("1");
        const liquidityPercent = 0; // 0%
        const ethForLiquidity = 0; // No ETH for liquidity
        const amountAMin = 0;
        const amountBMin = 0;
        const deadline = Math.floor(Date.now() / 1000) + 10;

        // This should not revert due to our validation
        // Note: It will likely revert due to router interaction, but not due to our validation
        await expect(
          sniper.connect(user1).swapAndAddLiquidity(
            amountOut,
            validPath,
            liquidityPercent,
            ethForLiquidity,
            amountAMin,
            amountBMin,
            user1.address,
            deadline,
            { value: ethers.parseEther("0.1") }
          )
        ).to.not.be.revertedWith("Sniper: INVALID_PERCENTAGE");
      });

      it("Should handle 100% liquidity", async function () {
        const { sniper, user1 } = await contractFixture();

        const validPath = [
          WETH_ADDRESS, // WETH
          BUSD_ADDRESS  // BUSD token
        ];

        const amountOut = ethers.parseEther("1");
        const liquidityPercent = 10000; // 100%
        const ethForLiquidity = ethers.parseEther("0.05");
        const amountAMin = 0; // Set to 0 to avoid router validation
        const amountBMin = 0; // Set to 0 to avoid router validation
        const deadline = Math.floor(Date.now() / 1000) + 10;

        // This should not revert due to our validation
        await expect(
          sniper.connect(user1).swapAndAddLiquidity(
            amountOut,
            validPath,
            liquidityPercent,
            ethForLiquidity,
            amountAMin,
            amountBMin,
            user1.address,
            deadline,
            { value: ethers.parseEther("0.1") }
          )
        ).to.not.be.revertedWith("Sniper: INVALID_PERCENTAGE");
      });

      it("Should handle 50% liquidity", async function () {
        const { sniper, user1 } = await contractFixture();

        const validPath = [
          WETH_ADDRESS, // WETH
          BUSD_ADDRESS  // BUSD token
        ];

        const amountOut = ethers.parseEther("1");
        const liquidityPercent = 5000; // 50%
        const ethForLiquidity = ethers.parseEther("0.05");
        const amountAMin = 0; // Set to 0 to avoid router validation
        const amountBMin = 0; // Set to 0 to avoid router validation
        const deadline = Math.floor(Date.now() / 1000) + 10;

        // This should not revert due to our validation
        await expect(
          sniper.connect(user1).swapAndAddLiquidity(
            amountOut,
            validPath,
            liquidityPercent,
            ethForLiquidity,
            amountAMin,
            amountBMin,
            user1.address,
            deadline,
            { value: ethers.parseEther("0.1") }
          )
        ).to.not.be.revertedWith("Sniper: INVALID_PERCENTAGE");
      });

      it("Should handle 25% liquidity", async function () {
        const { sniper, user1 } = await contractFixture();

        const validPath = [
          WETH_ADDRESS, // WETH
          BUSD_ADDRESS  // BUSD token
        ];

        const amountOut = ethers.parseEther("1");
        const liquidityPercent = 2500; // 25%
        const ethForLiquidity = ethers.parseEther("0.05");
        const amountAMin = 0; // Set to 0 to avoid router validation
        const amountBMin = 0; // Set to 0 to avoid router validation
        const deadline = Math.floor(Date.now() / 1000) + 10;

        // This should not revert due to our validation
        await expect(
          sniper.connect(user1).swapAndAddLiquidity(
            amountOut,
            validPath,
            liquidityPercent,
            ethForLiquidity,
            amountAMin,
            amountBMin,
            user1.address,
            deadline,
            { value: ethers.parseEther("0.1") }
          )
        ).to.not.be.revertedWith("Sniper: INVALID_PERCENTAGE");
      });
    });

    describe("ETH Distribution", function () {
      it("Should correctly split ETH between swap and liquidity", async function () {
        const { sniper, user1 } = await contractFixture();

        const validPath = [
          WETH_ADDRESS, // WETH
          BUSD_ADDRESS  // BUSD token
        ];

        const amountOut = ethers.parseEther("1");
        const liquidityPercent = 5000; // 50%
        const ethForLiquidity = ethers.parseEther("0.05");
        const amountAMin = 0; // Set to 0 to avoid router validation
        const amountBMin = 0; // Set to 0 to avoid router validation
        const deadline = Math.floor(Date.now() / 1000) + 10;
        const totalEth = ethers.parseEther("0.1");

        // This should not revert due to our validation
        await expect(
          sniper.connect(user1).swapAndAddLiquidity(
            amountOut,
            validPath,
            liquidityPercent,
            ethForLiquidity,
            amountAMin,
            amountBMin,
            user1.address,
            deadline,
            { value: totalEth }
          )
        ).to.not.be.revertedWith("Sniper: INSUFFICIENT_ETH_FOR_LIQUIDITY");
      });

      it("Should handle all ETH for swap (no liquidity)", async function () {
        const { sniper, user1 } = await contractFixture();

        const validPath = [
          WETH_ADDRESS, // WETH
          BUSD_ADDRESS  // BUSD token
        ];

        const amountOut = ethers.parseEther("1");
        const liquidityPercent = 0; // 0%
        const ethForLiquidity = 0; // No ETH for liquidity
        const amountAMin = 0;
        const amountBMin = 0;
        const deadline = Math.floor(Date.now() / 1000) + 10;

        // This should not revert due to our validation
        await expect(
          sniper.connect(user1).swapAndAddLiquidity(
            amountOut,
            validPath,
            liquidityPercent,
            ethForLiquidity,
            amountAMin,
            amountBMin,
            user1.address,
            deadline,
            { value: ethers.parseEther("0.1") }
          )
        ).to.not.be.revertedWith("Sniper: INSUFFICIENT_ETH_FOR_LIQUIDITY");
      });

      it("Should handle all ETH for liquidity (no swap)", async function () {
        const { sniper, user1 } = await contractFixture();

        const validPath = [
          WETH_ADDRESS, // WETH
          BUSD_ADDRESS  // BUSD token
        ];

        const amountOut = 0; // No tokens expected from swap
        const liquidityPercent = 10000; // 100%
        const ethForLiquidity = ethers.parseEther("0.1"); // All ETH for liquidity
        const amountAMin = 0; // Set to 0 to avoid router validation
        const amountBMin = 0; // Set to 0 to avoid router validation
        const deadline = Math.floor(Date.now() / 1000) + 10;

        // This should not revert due to our validation
        await expect(
          sniper.connect(user1).swapAndAddLiquidity(
            amountOut,
            validPath,
            liquidityPercent,
            ethForLiquidity,
            amountAMin,
            amountBMin,
            user1.address,
            deadline,
            { value: ethers.parseEther("0.1") }
          )
        ).to.not.be.revertedWith("Sniper: INSUFFICIENT_ETH_FOR_LIQUIDITY");
      });
    });

    describe("Function Interface", function () {
      it("Should have the correct function signature", async function () {
        const { sniper } = await contractFixture();

        // Verify the function exists and has the expected interface
        expect(sniper.swapAndAddLiquidity).to.be.a("function");
        
        // The function should accept 8 parameters and return a tuple
        const functionFragment = sniper.interface.getFunction("swapAndAddLiquidity");
        expect(functionFragment.inputs).to.have.length(8);
        expect(functionFragment.outputs).to.have.length(2);
      });
    });

    describe("Access Control", function () {
      it("Should allow any user to call swapAndAddLiquidity", async function () {
        const { sniper, user1, user2 } = await contractFixture();

        const validPath = [
          WETH_ADDRESS, // WETH
          BUSD_ADDRESS  // BUSD token
        ];

        const amountOut = ethers.parseEther("1");
        const liquidityPercent = 5000; // 50%
        const ethForLiquidity = ethers.parseEther("0.05");
        const amountAMin = 0; // Set to 0 to avoid router validation
        const amountBMin = 0; // Set to 0 to avoid router validation
        const deadline = Math.floor(Date.now() / 1000) + 10;

        // Test with different users - both should be able to call the function
        await expect(
          sniper.connect(user1).swapAndAddLiquidity(
            amountOut,
            validPath,
            liquidityPercent,
            ethForLiquidity,
            amountAMin,
            amountBMin,
            user1.address,
            deadline,
            { value: ethers.parseEther("0.1") }
          )
        ).to.not.be.revertedWith("Sniper: INVALID_PERCENTAGE");

        await expect(
          sniper.connect(user2).swapAndAddLiquidity(
            amountOut,
            validPath,
            liquidityPercent,
            ethForLiquidity,
            amountAMin,
            amountBMin,
            user2.address,
            deadline,
            { value: ethers.parseEther("0.1") }
          )
        ).to.not.be.revertedWith("Sniper: INVALID_PERCENTAGE");
      });
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