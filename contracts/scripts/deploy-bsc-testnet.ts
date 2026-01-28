/**
 * 部署脚本 - BSC Testnet
 *
 * 使用方法:
 * npx hardhat run scripts/deploy-bsc-testnet.ts --network bscTestnet
 *
 * 可选环境变量:
 * COOLDOWN - 冷却时间（秒），默认 86400（24小时）
 * START_TIME - 开始时间戳，默认为当前时间 + 60 秒
 *
 * 需要在 contracts 目录下创建 .env 文件:
 * BSC_TESTNET_PRIVATE_KEY=你的私钥
 */

import { network } from "hardhat";

const { ethers } = await network.connect();

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "BNB");

  // 1. 部署 UUToken
  console.log("\n1. Deploying UUToken...");
  const uuToken = await ethers.deployContract("UUToken");
  await uuToken.waitForDeployment();
  const uuTokenAddress = await uuToken.getAddress();
  console.log("UUToken deployed to:", uuTokenAddress);

  // 2. 部署 DailyKegel
  console.log("\n2. Deploying DailyKegel...");

  const now = Math.floor(Date.now() / 1000);
  const startTime = process.env.START_TIME
    ? parseInt(process.env.START_TIME)
    : now + 60; // 默认 1 分钟后开始
  const cooldown = process.env.COOLDOWN
    ? parseInt(process.env.COOLDOWN)
    : 24 * 60 * 60; // 默认 24 小时

  const dailyKegel = await ethers.deployContract("DailyKegel", [
    uuTokenAddress,
    startTime,
    cooldown,
  ]);
  await dailyKegel.waitForDeployment();
  const dailyKegelAddress = await dailyKegel.getAddress();
  console.log("DailyKegel deployed to:", dailyKegelAddress);

  // 输出部署信息
  console.log("\n========================================");
  console.log("Deployment Complete!");
  console.log("========================================");
  console.log("Network: BSC Testnet (Chain ID: 97)");
  console.log("UUToken:", uuTokenAddress);
  console.log("DailyKegel:", dailyKegelAddress);
  console.log("Start Time:", new Date(startTime * 1000).toISOString());
  console.log("Cooldown:", cooldown, "seconds", `(${cooldown / 3600} hours)`);
  console.log("========================================");

  // 输出前端 .env 配置
  console.log("\n📝 前端 .env 配置:");
  console.log(`
NEXT_PUBLIC_CONTRACT_ADDRESS=${dailyKegelAddress}
NEXT_PUBLIC_TOKEN_ADDRESS=${uuTokenAddress}
NEXT_PUBLIC_CHAIN_ID=97
  `);

  // 输出验证命令
  console.log("📝 验证合约:");
  console.log(`npx hardhat verify --network bscTestnet ${uuTokenAddress}`);
  console.log(`npx hardhat verify --network bscTestnet ${dailyKegelAddress} ${uuTokenAddress} ${startTime} ${cooldown}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
