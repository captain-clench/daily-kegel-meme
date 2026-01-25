import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * 部署模块
 * 一次性部署 UUToken 和 DailyKegel 合约
 */
export default buildModule("Season1Module", (m) => {
  // 部署 UUToken
  const uuToken = m.contract("UUToken");

  // 获取开始时间参数（默认：立即开始）
  const startTime = m.getParameter("startTime", Math.floor(Date.now() / 1000));

  // 部署 DailyKegel
  const dailyKegel = m.contract("DailyKegel", [uuToken, startTime]);

  return { uuToken, dailyKegel };
});
