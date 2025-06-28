import { expect } from "chai";
import hre from "hardhat";
import { ethers } from "hardhat";
import { PANCAKE_ROUTER_ADDRESS, WETH_ADDRESS, contractFixture } from "./constants";

describe("Sniper - Deployment", function () {
  describe("Deployment", function () {
    it("Should deploy with correct immutable addresses", async function () {
      const { sniper } = await contractFixture();

      // Check that the immutable addresses are set correctly
      expect(await sniper.PANCAKE_ROUTER_ADDRESS()).to.equal(PANCAKE_ROUTER_ADDRESS);
      expect(await sniper.WETH()).to.equal(WETH_ADDRESS);
    });

    it("Should have correct contract address format", async function () {
      const { sniper } = await contractFixture();

      // Verify the contract address is valid
      expect(ethers.isAddress(sniper.target)).to.be.true;
    });
  });
}); 