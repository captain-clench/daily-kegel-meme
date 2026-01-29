/**
 * 部署 DailyKegel 合约
 *
 * 用法:
 *   UIU_TOKEN=0x... npx hardhat run scripts/deploy-dailykegel.ts --network bscTestnet
 *
 * 环境变量:
 *   UIU_TOKEN - UIU 代币合约地址 (必填)
 *   START_TIME - 开始时间戳 (可选，默认为当前时间)
 *   COOLDOWN - 冷却时间（秒）(可选，默认 86400 即 24 小时)
 *   BSC_TESTNET_PRIVATE_KEY - 部署账户私钥 (bscTestnet)
 *   BSC_PRIVATE_KEY - 部署账户私钥 (bsc)
 */

import { network } from "hardhat";

const { ethers } = await network.connect();

async function main() {
  // 从环境变量获取参数
  const tokenAddress = process.env.UIU_TOKEN;
  const startTime = process.env.START_TIME
    ? parseInt(process.env.START_TIME)
    : Math.floor(Date.now() / 1000);
  const cooldown = process.env.COOLDOWN
    ? parseInt(process.env.COOLDOWN)
    : 24 * 60 * 60; // 默认 24 小时

  if (!tokenAddress) {
    console.error("Error: UIU_TOKEN environment variable is required");
    console.error("");
    console.error("Usage:");
    console.error("  UIU_TOKEN=0x... npx hardhat run scripts/deploy-dailykegel.ts --network bscTestnet");
    console.error("");
    console.error("Optional:");
    console.error("  COOLDOWN=300 UIU_TOKEN=0x... npx hardhat run scripts/deploy-dailykegel.ts --network bscTestnet");
    console.error("  START_TIME=1234567890 COOLDOWN=300 UIU_TOKEN=0x... npx hardhat run scripts/deploy-dailykegel.ts --network bscTestnet");
    process.exit(1);
  }

  if (!ethers.isAddress(tokenAddress)) {
    console.error("Error: Invalid token address:", tokenAddress);
    process.exit(1);
  }

  const [deployer] = await ethers.getSigners();

  console.log("Deploying DailyKegel with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "BNB");
  console.log("");

  console.log("Parameters:");
  console.log("  UIU Token:", tokenAddress);
  console.log("  Start Time:", startTime, `(${new Date(startTime * 1000).toISOString()})`);
  console.log("  Cooldown:", cooldown, "seconds", `(${cooldown / 3600} hours)`);
  console.log("");

  // 部署合约
  console.log("Deploying DailyKegel...");
  const dailyKegel = await ethers.deployContract("DailyKegel", [
    tokenAddress,
    startTime,
    cooldown,
  ]);

  await dailyKegel.waitForDeployment();
  const contractAddress = await dailyKegel.getAddress();

  console.log("");
  console.log("========================================");
  console.log("DailyKegel deployed successfully!");
  console.log("Contract address:", contractAddress);
  console.log("========================================");
  console.log("");
  console.log("Verify on BscScan:");
  console.log(`  npx hardhat verify --network bscTestnet ${contractAddress} ${tokenAddress} ${startTime} ${cooldown}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
