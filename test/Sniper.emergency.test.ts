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
import { IERC20, Sniper } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("Sniper - Emergency Withdrawal", function () {
  describe("emergencyWithdraw", function () {
    let sniper: Sniper;
    let owner: SignerWithAddress;
    let user1: SignerWithAddress;
    let busdContract: IERC20;

    beforeEach(async function () {
      const fixture = await contractFixture();
      sniper = fixture.sniper;
      owner = fixture.owner;
      user1 = fixture.user1;
      busdContract = await ethers.getContractAt("IERC20", BUSD_ADDRESS);

      // Fund the contract with BUSD for testing
      const bscTokenHub = "0x0000000000000000000000000000000000001004";
      await hre.network.provider.send("hardhat_impersonateAccount", [bscTokenHub]);
      const bscTokenHubSigner = await ethers.getSigner(bscTokenHub);
      
      // Fund the hub account with ETH for gas
      await owner.sendTransaction({
        to: bscTokenHub,
        value: ethers.parseEther("10")
      });

      // Mint 1000 BUSD to the sniper contract
      await busdContract.connect(bscTokenHubSigner).transfer(sniper.target, ethers.parseEther("1000"));
      
      // Verify the contract has BUSD
      const balance = await busdContract.balanceOf(sniper.target);
      expect(balance).to.equal(ethers.parseEther("1000"));
    });

    describe("Access Control", function () {
      it("Should only allow owner to call emergencyWithdraw", async function () {
        await expect(
          sniper.connect(user1).emergencyWithdraw(BUSD_ADDRESS, ethers.parseEther("1"))
        ).to.be.revertedWithCustomError(sniper, "OwnableUnauthorizedAccount");
      });

      it("Should allow owner to call emergencyWithdraw", async function () {
        const initialBalance = await busdContract.balanceOf(sniper.target);
        const withdrawAmount = ethers.parseEther("100");
        
        await expect(
          sniper.connect(owner).emergencyWithdraw(BUSD_ADDRESS, withdrawAmount)
        ).to.not.be.reverted;

        const finalBalance = await busdContract.balanceOf(sniper.target);
        expect(finalBalance).to.equal(initialBalance - withdrawAmount);
      });
    });

    describe("Parameter Validation", function () {
      it("Should revert when token address is zero", async function () {
        await expect(
          sniper.connect(owner).emergencyWithdraw(ethers.ZeroAddress, ethers.parseEther("1"))
        ).to.be.revertedWith(ERROR_INVALID_TOKEN);
      });

      it("Should revert when amount is zero", async function () {
        await expect(
          sniper.connect(owner).emergencyWithdraw(BUSD_ADDRESS, 0)
        ).to.be.revertedWith(ERROR_INVALID_AMOUNT);
      });

      it("Should revert when contract has insufficient token balance", async function () {
        const largeAmount = ethers.parseEther("10000"); // More than contract has

        await expect(
          sniper.connect(owner).emergencyWithdraw(BUSD_ADDRESS, largeAmount)
        ).to.be.revertedWith(ERROR_INSUFFICIENT_BALANCE);
      });
    });

    describe("Token Withdrawals", function () {
      it("Should successfully withdraw BUSD tokens", async function () {
        const initialBalance = await busdContract.balanceOf(sniper.target);
        const withdrawAmount = ethers.parseEther("500");
        
        await sniper.connect(owner).emergencyWithdraw(BUSD_ADDRESS, withdrawAmount);

        const finalBalance = await busdContract.balanceOf(sniper.target);
        expect(finalBalance).to.equal(initialBalance - withdrawAmount);
      });

      it("Should handle different token addresses", async function () {
        const differentTokens = [WETH_ADDRESS, USDC_ADDRESS, USDT_ADDRESS];
        const testAmount = ethers.parseEther("1");

        for (const token of differentTokens) {
          // These will likely fail due to insufficient balance, but should not fail due to invalid token
          await expect(
            sniper.connect(owner).emergencyWithdraw(token, testAmount)
          ).to.not.be.revertedWith(ERROR_INVALID_TOKEN);
        }
      });

      it("Should handle very small amounts", async function () {
        const smallAmount = 1n; // 1 wei
        const initialBalance = await busdContract.balanceOf(sniper.target);
        
        await sniper.connect(owner).emergencyWithdraw(BUSD_ADDRESS, smallAmount);

        const finalBalance: bigint = await busdContract.balanceOf(sniper.target);
        expect(finalBalance).to.equal(initialBalance - smallAmount);
      });

      it("Should handle maximum uint256 amount", async function () {
        const maxAmount = ethers.MaxUint256;
        
        await expect(
          sniper.connect(owner).emergencyWithdraw(BUSD_ADDRESS, maxAmount)
        ).to.be.revertedWith(ERROR_INSUFFICIENT_BALANCE);
      });
    });

    describe("ETH Withdrawals", function () {
      it("Should handle ETH withdrawal logic correctly", async function () {
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

    describe("Balance Management", function () {
      it("Should withdraw all available BUSD tokens", async function () {
        const initialBalance = await busdContract.balanceOf(sniper.target);
        
        await sniper.connect(owner).emergencyWithdraw(BUSD_ADDRESS, initialBalance);

        const finalBalance = await busdContract.balanceOf(sniper.target);
        expect(finalBalance).to.equal(0);
      });

      it("Should allow partial withdrawals", async function () {
        const initialBalance = await busdContract.balanceOf(sniper.target);
        const partialAmount = initialBalance / 4n; // Withdraw 25%
        
        await sniper.connect(owner).emergencyWithdraw(BUSD_ADDRESS, partialAmount);

        const finalBalance = await busdContract.balanceOf(sniper.target);
        expect(finalBalance).to.equal(initialBalance - partialAmount);
      });
    });
  });
}); 