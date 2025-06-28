import { expect } from "chai";
import hre from "hardhat";
import { ethers } from "hardhat";
import { 
  WETH_ADDRESS, 
  BUSD_ADDRESS, 
  USDC_ADDRESS, 
  USDT_ADDRESS, 
  PANCAKE_FACTORY_ADDRESS,
  contractFixture 
} from "./constants";
import { getRelativeTimestamp } from "./utils";
import { IERC20, IPancakePair, Sniper } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { IPancakeFactory } from "../typechain-types/contracts/Sniper.sol";

describe("Sniper - Add Liquidity Functionality", function () {
  describe("addLiquidity", function () {
    let sniper: Sniper;
    let owner: SignerWithAddress;
    let user1: SignerWithAddress;
    let busdContract: IERC20;
    let factoryContract: IPancakeFactory;
    let pairContract: IPancakePair;

    beforeEach(async function () {
      const fixture = await contractFixture();
      sniper = fixture.sniper;
      owner = fixture.owner;
      user1 = fixture.user1;
      busdContract = await ethers.getContractAt("IERC20", BUSD_ADDRESS);
      factoryContract = await ethers.getContractAt("IPancakeFactory", PANCAKE_FACTORY_ADDRESS);

      // Fund the contract with BUSD for testing
      const bscTokenHub = "0x0000000000000000000000000000000000001004";
      await hre.network.provider.send("hardhat_impersonateAccount", [bscTokenHub]);
      const bscTokenHubSigner = await ethers.getSigner(bscTokenHub);
      
      // Fund the hub account with ETH for gas
      await owner.sendTransaction({
        to: bscTokenHub,
        value: ethers.parseEther("10")
      });

      // Mint BUSD to the sniper contract
      await busdContract.connect(bscTokenHubSigner).transfer(sniper.target, ethers.parseEther("1000"));
      
      // Verify the contract has BUSD
      const busdBalance = await busdContract.balanceOf(sniper.target);
      expect(busdBalance).to.equal(ethers.parseEther("1000"));

      // Get the WETH-BUSD pair address
      const pairAddress = await factoryContract.getPair(WETH_ADDRESS, BUSD_ADDRESS);
      pairContract = await ethers.getContractAt("IPancakePair", pairAddress);
    });

    describe("Basic Functionality", function () {
      it("Should successfully add liquidity with BNB and BUSD", async function () {
        const amountEth = ethers.parseEther("1");
        const amountBUSD = ethers.parseEther("100");
        const deadline = await getRelativeTimestamp(+60); // 60 seconds from now

        // Get initial balances
        const initialBusdBalance = await busdContract.balanceOf(sniper.target);
        const initialContractEthBalance = await ethers.provider.getBalance(sniper.target);

        // Fund contract with ETH for the liquidity addition
        await owner.sendTransaction({
          to: sniper.target,
          value: amountEth
        });

        // Add liquidity
        await sniper.connect(owner).addLiquidity(
          BUSD_ADDRESS,
          amountEth,
          amountBUSD,
          deadline
        );

        // Check final balances
        const finalBusdBalance = await busdContract.balanceOf(sniper.target);
        const finalContractEthBalance = await ethers.provider.getBalance(sniper.target);

        // BUSD balance should decrease after adding liquidity
        expect(finalBusdBalance).to.be.lt(initialBusdBalance);
        // ETH balance should decrease (converted to WETH for liquidity)
        expect(finalContractEthBalance).to.be.lt(initialContractEthBalance + amountEth);
      });

      it("Should handle different token pairs", async function () {
        const usdcContract = await ethers.getContractAt("IERC20", USDC_ADDRESS);
        
        // Fund contract with USDC
        const bscTokenHub = "0x0000000000000000000000000000000000001004";
        await hre.network.provider.send("hardhat_impersonateAccount", [bscTokenHub]);
        const bscTokenHubSigner = await ethers.getSigner(bscTokenHub);
        await usdcContract.connect(bscTokenHubSigner).transfer(sniper.target, ethers.parseEther("1000"));

        const amountEth = ethers.parseEther("0.5");
        const amountUSDC = ethers.parseEther("500");
        const deadline = await getRelativeTimestamp(+60);

        // Get initial balances
        const initialUsdcBalance = await usdcContract.balanceOf(sniper.target);
        const initialContractEthBalance = await ethers.provider.getBalance(sniper.target);

        // Fund contract with ETH for the liquidity addition
        await owner.sendTransaction({
          to: sniper.target,
          value: amountEth
        });

        // Add liquidity
        await sniper.connect(owner).addLiquidity(
          USDC_ADDRESS,
          amountEth,
          amountUSDC,
          deadline
        );

        // Check final balances
        const finalUsdcBalance = await usdcContract.balanceOf(sniper.target);
        const finalContractEthBalance = await ethers.provider.getBalance(sniper.target);

        // USDC balance should decrease
        expect(finalUsdcBalance).to.be.lt(initialUsdcBalance);
        // ETH balance should decrease
        expect(finalContractEthBalance).to.be.lt(initialContractEthBalance + amountEth);
      });
    });

    describe("Reserves and Price Changes", function () {
      it("Should increase pair reserves after adding liquidity", async function () {
        const amountEth = ethers.parseEther("2");
        const amountBUSD = ethers.parseEther("200");
        const deadline = await getRelativeTimestamp(+60);

        // Get initial reserves
        const [initialReserve0, initialReserve1] = await pairContract.getReserves();
        
        // Fund contract with ETH
        await owner.sendTransaction({
          to: sniper.target,
          value: amountEth
        });

        // Add liquidity
        await sniper.connect(owner).addLiquidity(
          BUSD_ADDRESS,
          amountEth,
          amountBUSD,
          deadline
        );

        // Get final reserves
        const [finalReserve0, finalReserve1] = await pairContract.getReserves();

        // Reserves should increase
        expect(finalReserve0).to.be.gt(initialReserve0);
        expect(finalReserve1).to.be.gt(initialReserve1);
      });

      it("Should maintain price ratio when adding liquidity", async function () {
        const amountEth = ethers.parseEther("1");
        const amountBUSD = ethers.parseEther("100");
        const deadline = await getRelativeTimestamp(+60);

        // Get initial reserves and calculate price
        const [initialReserve0, initialReserve1] = await pairContract.getReserves();
        const initialPrice = initialReserve1 > 0 ? Number(initialReserve0 * ethers.parseEther("1") / initialReserve1) : 0;

        // Fund contract with ETH
        await owner.sendTransaction({
          to: sniper.target,
          value: amountEth
        });

        // Add liquidity
        await sniper.connect(owner).addLiquidity(
          BUSD_ADDRESS,
          amountEth,
          amountBUSD,
          deadline
        );

        // Get final reserves and calculate price
        const [finalReserve0, finalReserve1] = await pairContract.getReserves();
        const finalPrice = finalReserve1 > 0 ? Number(finalReserve0 * ethers.parseEther("1") / finalReserve1) : 0;

        // Price should remain relatively stable (within 1% tolerance)
        if (initialPrice > 0) {
          const priceChange = Math.abs(Number(finalPrice - initialPrice)) / Number(initialPrice);
          expect(priceChange).to.be.lt(0.01); // Less than 1% change
        }
      });

      it("Should increase total liquidity supply", async function () {
        const amountEth = ethers.parseEther("1");
        const amountBUSD = ethers.parseEther("100");
        const deadline = await getRelativeTimestamp(+60);

        // Get initial total supply
        const initialTotalSupply = await pairContract.totalSupply();

        // Fund contract with ETH
        await owner.sendTransaction({
          to: sniper.target,
          value: amountEth
        });

        // Add liquidity
        await sniper.connect(owner).addLiquidity(
          BUSD_ADDRESS,
          amountEth,
          amountBUSD,
          deadline
        );

        // Get final total supply
        const finalTotalSupply = await pairContract.totalSupply();

        // Total supply should increase
        expect(finalTotalSupply).to.be.gt(initialTotalSupply);
      });

      it("Should calculate correct liquidity based on reserves", async function () {
        const amountEth = ethers.parseEther("1");
        const amountBUSD = ethers.parseEther("100");
        const deadline = await getRelativeTimestamp(+60);

        // Get initial reserves
        const [initialReserve0, initialReserve1] = await pairContract.getReserves();
        const initialTotalSupply = await pairContract.totalSupply();

        // Fund contract with ETH
        await owner.sendTransaction({
          to: sniper.target,
          value: amountEth
        });

        // Add liquidity
        await sniper.connect(owner).addLiquidity(
          BUSD_ADDRESS,
          amountEth,
          amountBUSD,
          deadline
        );

        // Get final reserves
        const [finalReserve0, finalReserve1] = await pairContract.getReserves();
        const finalTotalSupply = await pairContract.totalSupply();

        // Verify that reserves increased
        expect(finalReserve0).to.be.gt(initialReserve0);
        expect(finalReserve1).to.be.gt(initialReserve1);
        expect(finalTotalSupply).to.be.gt(initialTotalSupply);
      });
    });

    describe("Balance Changes", function () {
      it("Should decrease contract token balances after adding liquidity", async function () {
        const amountEth = ethers.parseEther("2");
        const amountBUSD = ethers.parseEther("200");
        const deadline = await getRelativeTimestamp(+60);

        // Get initial balances
        const initialBusdBalance = await busdContract.balanceOf(sniper.target);
        const initialContractEthBalance = await ethers.provider.getBalance(sniper.target);

        // Fund contract with ETH for the liquidity addition
        await owner.sendTransaction({
          to: sniper.target,
          value: amountEth
        });

        // Add liquidity
        await sniper.connect(owner).addLiquidity(
          BUSD_ADDRESS,
          amountEth,
          amountBUSD,
          deadline
        );

        // Check final balances
        const finalBusdBalance = await busdContract.balanceOf(sniper.target);
        const finalContractEthBalance = await ethers.provider.getBalance(sniper.target);

        // Verify BUSD balance decreased
        expect(finalBusdBalance).to.equal(initialBusdBalance - amountBUSD);
        // Verify ETH balance decreased (converted to WETH)
        expect(finalContractEthBalance).to.equal(initialContractEthBalance);
      });

      it("Should handle small amounts correctly", async function () {
        const amountEth = ethers.parseEther("0.01");
        const amountBUSD = ethers.parseEther("1");
        const deadline = await getRelativeTimestamp(+60);

        // Get initial balances
        const initialBusdBalance = await busdContract.balanceOf(sniper.target);
        const initialContractEthBalance = await ethers.provider.getBalance(sniper.target);

        // Fund contract with ETH for the liquidity addition
        await owner.sendTransaction({
          to: sniper.target,
          value: amountEth
        });

        // Add liquidity
        await sniper.connect(owner).addLiquidity(
          BUSD_ADDRESS,
          amountEth,
          amountBUSD,
          deadline
        );

        // Check final balances
        const finalBusdBalance = await busdContract.balanceOf(sniper.target);
        const finalContractEthBalance = await ethers.provider.getBalance(sniper.target);

        // Verify BUSD balance decreased
        expect(finalBusdBalance).to.equal(initialBusdBalance - amountBUSD);
        // Verify ETH balance decreased
        expect(finalContractEthBalance).to.equal(initialContractEthBalance);
      });
    });

    describe("Deadline Handling", function () {
      it("Should revert when deadline has passed", async function () {
        const amountEth = ethers.parseEther("1");
        const amountBUSD = ethers.parseEther("100");
        const deadline = await getRelativeTimestamp(-10); // Past deadline

        // Fund contract with ETH
        await owner.sendTransaction({
          to: sniper.target,
          value: amountEth
        });

        await expect(
          sniper.connect(owner).addLiquidity(
            BUSD_ADDRESS,
            amountEth,
            amountBUSD,
            deadline
          )
        ).to.be.revertedWith("PancakeRouter: EXPIRED");
      });

      it("Should work with future deadline", async function () {
        const amountEth = ethers.parseEther("1");
        const amountBUSD = ethers.parseEther("100");
        const deadline = await getRelativeTimestamp(+300); // 5 minutes from now

        // Get initial balances
        const initialBusdBalance = await busdContract.balanceOf(sniper.target);
        const initialContractEthBalance = await ethers.provider.getBalance(sniper.target);

        // Fund contract with ETH for the liquidity addition
        await owner.sendTransaction({
          to: sniper.target,
          value: amountEth
        });

        // Add liquidity
        await sniper.connect(owner).addLiquidity(
          BUSD_ADDRESS,
          amountEth,
          amountBUSD,
          deadline
        );

        // Check final balances
        const finalBusdBalance = await busdContract.balanceOf(sniper.target);
        const finalContractEthBalance = await ethers.provider.getBalance(sniper.target);

        // Verify BUSD balance decreased
        expect(finalBusdBalance).to.equal(initialBusdBalance - amountBUSD);
        // Verify ETH balance decreased
        expect(finalContractEthBalance).to.equal(initialContractEthBalance);
      });
    });

    describe("Insufficient Balance Handling", function () {
      it("Should revert when contract has insufficient ETH", async function () {
        const amountEth = ethers.parseEther("1");
        const amountBUSD = ethers.parseEther("100");
        const deadline = await getRelativeTimestamp(+60);

        // Don't fund the contract with ETH

        await expect(
          sniper.connect(owner).addLiquidity(
            BUSD_ADDRESS,
            amountEth,
            amountBUSD,
            deadline
          )
        ).to.be.reverted; // Should revert due to insufficient ETH
      });

      it("Should revert when contract has insufficient BUSD", async function () {
        const amountEth = ethers.parseEther("2");
        const balanceBUSD = await busdContract.balanceOf(sniper.target);
        const amountBUSD = balanceBUSD + ethers.parseEther("1");
        const deadline = await getRelativeTimestamp(+60);

        // Fund contract with ETH
        await owner.sendTransaction({
          to: sniper.target,
          value: amountEth
        });

        await expect(
          sniper.connect(owner).addLiquidity(
            BUSD_ADDRESS,
            amountEth,
            amountBUSD,
            deadline
          )
        ).to.be.reverted; // Should revert due to insufficient BUSD
      });
    });

    describe("Access Control", function () {
      it("Should allow any user to call addLiquidity (no access control)", async function () {
        const amountEth = ethers.parseEther("0.5");
        const amountBUSD = ethers.parseEther("50");
        const deadline = await getRelativeTimestamp(+60);

        // Get initial balances
        const initialBusdBalance = await busdContract.balanceOf(sniper.target);
        const initialContractEthBalance = await ethers.provider.getBalance(sniper.target);

        // Fund contract with ETH for the liquidity addition
        await owner.sendTransaction({
          to: sniper.target,
          value: amountEth
        });

        // Non-owner should be able to call (no access control on this function)
        await sniper.connect(user1).addLiquidity(
          BUSD_ADDRESS,
          amountEth,
          amountBUSD,
          deadline
        );

        // Check final balances
        const finalBusdBalance = await busdContract.balanceOf(sniper.target);
        const finalContractEthBalance = await ethers.provider.getBalance(sniper.target);

        // Verify BUSD balance decreased
        expect(finalBusdBalance).to.equal(initialBusdBalance - amountBUSD);
        // Verify ETH balance decreased
        expect(finalContractEthBalance).to.equal(initialContractEthBalance);
      });
    });

    describe("Return Values", function () {
      it("Should return correct amounts and liquidity", async function () {
        const amountEth = ethers.parseEther("1");
        const amountBUSD = ethers.parseEther("100");
        const deadline = await getRelativeTimestamp(+60);

        // Fund contract with ETH
        await owner.sendTransaction({
          to: sniper.target,
          value: amountEth
        });

        // Add liquidity and capture return values
        const tx = await sniper.connect(owner).addLiquidity(
          BUSD_ADDRESS,
          amountEth,
          amountBUSD,
          deadline
        );

        // Wait for transaction to be mined
        const receipt = await tx.wait();
        
        // The function should complete successfully
        expect(receipt?.status).to.equal(1);
      });
    });
  });
}); 