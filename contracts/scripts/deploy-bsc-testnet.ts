/**
 * 部署脚本 - BSC Testnet
 *
 * 使用方法:
 * npx hardhat run scripts/deploy-bsc-testnet.ts --network bscTestnet
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

  // 赛季时间配置
  const now = Math.floor(Date.now() / 1000);
  const startTime = now + 60; // 1分钟后开始
  const endTime = now + 30 * 24 * 60 * 60; // 30天后结束

  const dailyKegel = await ethers.deployContract("DailyKegel", [
    uuTokenAddress,
    startTime,
    endTime,
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
  console.log("End Time:", new Date(endTime * 1000).toISOString());
  console.log("========================================");

  // 输出数据库插入语句
  console.log("\n📝 数据库插入语句:");
  console.log(`
INSERT INTO Season (name, displayName, contractAddress, tokenAddress, chainId, startTime, endTime, active, createdAt, updatedAt)
VALUES (
  'season1',
  '第一赛季',
  '${dailyKegelAddress}',
  '${uuTokenAddress}',
  97,
  FROM_UNIXTIME(${startTime}),
  FROM_UNIXTIME(${endTime}),
  1,
  NOW(),
  NOW()
);
  `);

  // 输出前端 .env 配置
  console.log("\n📝 前端 .env 配置:");
  console.log(`
# BSC Testnet Season 1
NEXT_PUBLIC_SEASON1_CONTRACT=${dailyKegelAddress}
NEXT_PUBLIC_SEASON1_TOKEN=${uuTokenAddress}
NEXT_PUBLIC_CHAIN_ID=97
  `);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
