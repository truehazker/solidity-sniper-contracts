// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const SniperModule = buildModule("SniperModule", (m) => {
  const sniper = m.contract("Sniper");

  return { sniper };
});

export default SniperModule; 