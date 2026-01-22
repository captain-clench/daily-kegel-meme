import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("UUTokenModule", (m) => {
  const uuToken = m.contract("UUToken");

  return { uuToken };
});
