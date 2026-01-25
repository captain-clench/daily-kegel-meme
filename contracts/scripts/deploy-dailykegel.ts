/**
 * 部署 DailyKegel 合约
 *
 * 用法:
 *   UU_TOKEN=0x... npx hardhat run scripts/deploy-dailykegel.ts --network bscTestnet
 *
 * 环境变量:
 *   UU_TOKEN - UU 代币合约地址 (必填)
 *   START_TIME - 开始时间戳 (可选，默认为当前时间)
 *   BSC_TESTNET_PRIVATE_KEY - 部署账户私钥 (bscTestnet)
 *   BSC_PRIVATE_KEY - 部署账户私钥 (bsc)
 */

import { network } from "hardhat";

const { ethers } = await network.connect();

async function main() {
  // 从环境变量获取参数
  const tokenAddress = process.env.UU_TOKEN;
  const startTime = process.env.START_TIME
    ? parseInt(process.env.START_TIME)
    : Math.floor(Date.now() / 1000);

  if (!tokenAddress) {
    console.error("Error: UU_TOKEN environment variable is required");
    console.error("");
    console.error("Usage:");
    console.error("  UU_TOKEN=0x... npx hardhat run scripts/deploy-dailykegel.ts --network bscTestnet");
    console.error("");
    console.error("Optional:");
    console.error("  START_TIME=1234567890 UU_TOKEN=0x... npx hardhat run scripts/deploy-dailykegel.ts --network bscTestnet");
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
  console.log("  UU Token:", tokenAddress);
  console.log("  Start Time:", startTime, `(${new Date(startTime * 1000).toISOString()})`);
  console.log("");

  // 部署合约
  console.log("Deploying DailyKegel...");
  const dailyKegel = await ethers.deployContract("DailyKegel", [
    tokenAddress,
    startTime,
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
  console.log(`  npx hardhat verify --network bscTestnet ${contractAddress} ${tokenAddress} ${startTime}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
