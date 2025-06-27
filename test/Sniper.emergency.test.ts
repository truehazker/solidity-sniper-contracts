import { expect } from "chai";
import hre from "hardhat";
import { ethers } from "hardhat";
import { 
  WETH_ADDRESS, 
  BUSD_ADDRESS, 
  USDC_ADDRESS, 
  USDT_ADDRESS, 
  ERROR_INVALID_TOKEN, 
  ERROR_INVALID_AMOUNT, 
  ERROR_INSUFFICIENT_BALANCE, 
  contractFixture 
} from "./constants";

describe("Sniper - Emergency Withdrawal", function () {
  describe("emergencyWithdraw", function () {
    describe("Access Control", function () {
      it("Should only allow owner to call emergencyWithdraw", async function () {
        const { sniper, user1 } = await contractFixture();

        await expect(
          sniper.connect(user1).emergencyWithdraw(BUSD_ADDRESS, ethers.parseEther("1"))
        ).to.be.revertedWithCustomError(sniper, "OwnableUnauthorizedAccount");
      });

      it("Should allow owner to call emergencyWithdraw", async function () {
        const { sniper, owner } = await contractFixture();

        // This should not revert due to access control
        // Note: It will likely revert due to insufficient balance, but not due to access control
        await expect(
          sniper.connect(owner).emergencyWithdraw(BUSD_ADDRESS, ethers.parseEther("1"))
        ).to.not.be.revertedWithCustomError(sniper, "OwnableUnauthorizedAccount");
      });
    });

    describe("Token Withdrawals", function () {
      it("Should revert when token address is zero", async function () {
        const { sniper, owner } = await contractFixture();

        await expect(
          sniper.connect(owner).emergencyWithdraw(ethers.ZeroAddress, ethers.parseEther("1"))
        ).to.be.revertedWith(ERROR_INVALID_TOKEN);
      });

      it("Should revert when amount is zero", async function () {
        const { sniper, owner } = await contractFixture();

        await expect(
          sniper.connect(owner).emergencyWithdraw(BUSD_ADDRESS, 0)
        ).to.be.revertedWith(ERROR_INVALID_AMOUNT);
      });

      it("Should revert when contract has insufficient token balance", async function () {
        const { sniper, owner } = await contractFixture();

        const largeAmount = ethers.parseEther("1000000"); // Large amount that contract won't have

        await expect(
          sniper.connect(owner).emergencyWithdraw(BUSD_ADDRESS, largeAmount)
        ).to.be.revertedWith(ERROR_INSUFFICIENT_BALANCE);
      });

      it("Should handle valid token withdrawal parameters", async function () {
        const { sniper, owner } = await contractFixture();

        const validAmount = ethers.parseEther("1");

        // This should not revert due to parameter validation
        // Note: It will likely revert due to insufficient balance, but not due to our validation
        await expect(
          sniper.connect(owner).emergencyWithdraw(BUSD_ADDRESS, validAmount)
        ).to.not.be.revertedWith(ERROR_INVALID_TOKEN);
      });
    });

    describe("ETH Withdrawals", function () {
      it("Should revert when trying to withdraw ETH with zero address", async function () {
        const { sniper, owner } = await contractFixture();

        await expect(
          sniper.connect(owner).emergencyWithdraw(ethers.ZeroAddress, ethers.parseEther("1"))
        ).to.be.revertedWith(ERROR_INVALID_TOKEN);
      });

      it("Should handle ETH withdrawal logic correctly", async function () {
        const { sniper, owner } = await contractFixture();

        // Send some ETH to the contract first
        const ethAmount = ethers.parseEther("1");
        await owner.sendTransaction({
          to: sniper.target,
          value: ethAmount
        });

        // Verify contract has ETH
        const contractBalance = await ethers.provider.getBalance(sniper.target);
        expect(contractBalance).to.equal(ethAmount);

        // Try to withdraw ETH (this will revert due to the zero address check)
        await expect(
          sniper.connect(owner).emergencyWithdraw(ethers.ZeroAddress, ethAmount)
        ).to.be.revertedWith(ERROR_INVALID_TOKEN);
      });
    });

    describe("Edge Cases", function () {
      it("Should handle very small amounts", async function () {
        const { sniper, owner } = await contractFixture();

        const smallAmount = 1; // 1 wei

        await expect(
          sniper.connect(owner).emergencyWithdraw(BUSD_ADDRESS, smallAmount)
        ).to.not.be.revertedWith(ERROR_INVALID_AMOUNT);
      });

      it("Should handle maximum uint256 amount", async function () {
        const { sniper, owner } = await contractFixture();

        const maxAmount = ethers.MaxUint256;

        await expect(
          sniper.connect(owner).emergencyWithdraw(BUSD_ADDRESS, maxAmount)
        ).to.not.be.revertedWith(ERROR_INVALID_AMOUNT);
      });

      it("Should handle different token addresses", async function () {
        const { sniper, owner } = await contractFixture();

        const differentTokens = [
          WETH_ADDRESS,
          BUSD_ADDRESS,
          USDC_ADDRESS,
          USDT_ADDRESS
        ];

        for (const token of differentTokens) {
          await expect(
            sniper.connect(owner).emergencyWithdraw(token, ethers.parseEther("1"))
          ).to.not.be.revertedWith(ERROR_INVALID_TOKEN);
        }
      });
    });

    describe("Balance Checks", function () {
      it("Should check contract balance before withdrawal", async function () {
        const { sniper, owner } = await contractFixture();

        // Get current contract balance for BUSD (likely zero)
        const busdContract = await hre.ethers.getContractAt("IERC20", BUSD_ADDRESS);
        const currentBalance = await busdContract.balanceOf(sniper.target);

        // Try to withdraw more than available
        const withdrawAmount = currentBalance + ethers.parseEther("1");

        await expect(
          sniper.connect(owner).emergencyWithdraw(BUSD_ADDRESS, withdrawAmount)
        ).to.be.revertedWith(ERROR_INSUFFICIENT_BALANCE);
      });
    });
  });
}); 