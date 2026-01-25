import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("DailyKegelModule", (m) => {
  // 参数：UU代币地址、开始时间
  const uuTokenAddress = m.getParameter("uuTokenAddress");
  const startTime = m.getParameter("startTime");

  const dailyKegel = m.contract("DailyKegel", [uuTokenAddress, startTime]);

  return { dailyKegel };
});
