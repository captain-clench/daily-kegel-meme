import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("DailyKegelModule", (m) => {
  // 参数：UU代币地址、开始时间、冷却时间
  const uuTokenAddress = m.getParameter("uuTokenAddress");
  const startTime = m.getParameter("startTime");
  const cooldown = m.getParameter("cooldown", 24n * 60n * 60n); // 默认 24 小时

  const dailyKegel = m.contract("DailyKegel", [uuTokenAddress, startTime, cooldown]);

  return { dailyKegel };
});
