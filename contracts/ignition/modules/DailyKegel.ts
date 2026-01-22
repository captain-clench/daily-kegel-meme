import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("DailyKegelModule", (m) => {
  // 参数：UU代币地址、开始时间、结束时间
  const uuTokenAddress = m.getParameter("uuTokenAddress");
  const startTime = m.getParameter("startTime");
  const endTime = m.getParameter("endTime");

  const dailyKegel = m.contract("DailyKegel", [uuTokenAddress, startTime, endTime]);

  return { dailyKegel };
});
