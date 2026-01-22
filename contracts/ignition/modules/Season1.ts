import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * Season1 部署模块
 * 一次性部署 UUToken 和 DailyKegel 合约
 */
export default buildModule("Season1Module", (m) => {
  // 部署 UUToken
  const uuToken = m.contract("UUToken");

  // 获取赛季时间参数（默认：现在开始，30天后结束）
  const startTime = m.getParameter("startTime", Math.floor(Date.now() / 1000));
  const endTime = m.getParameter("endTime", Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60);

  // 部署 DailyKegel
  const dailyKegel = m.contract("DailyKegel", [uuToken, startTime, endTime]);

  return { uuToken, dailyKegel };
});
