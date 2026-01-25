// DailyKegel 合约配置
// 从环境变量读取，支持不同环境（测试网/主网）

export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`;
export const TOKEN_ADDRESS = process.env.NEXT_PUBLIC_TOKEN_ADDRESS as `0x${string}`;
export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 97); // 默认 BSC 测试网

// 验证配置
if (!CONTRACT_ADDRESS || CONTRACT_ADDRESS === "0x待部署的合约地址") {
  console.warn("警告: NEXT_PUBLIC_CONTRACT_ADDRESS 未配置，请在 .env 中设置");
}

if (!TOKEN_ADDRESS) {
  console.warn("警告: NEXT_PUBLIC_TOKEN_ADDRESS 未配置，请在 .env 中设置");
}
