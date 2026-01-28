/**
 * 设置 DailyKegel 合约的冷却时间
 *
 * 用法:
 *   CONTRACT=0x... COOLDOWN=300 npx hardhat run scripts/set-dailykegel-cooldown.ts --network bscTestnet
 *
 * 环境变量:
 *   CONTRACT - DailyKegel 合约地址 (必填)
 *   COOLDOWN - 冷却时间（秒）(必填)
 *   BSC_TESTNET_PRIVATE_KEY - 部署账户私钥 (bscTestnet)
 *   BSC_PRIVATE_KEY - 部署账户私钥 (bsc)
 */

import { network } from "hardhat";

const { ethers } = await network.connect();

async function main() {
  const contractAddress = process.env.CONTRACT;
  const cooldown = process.env.COOLDOWN;

  if (!contractAddress || !cooldown) {
    console.error("Error: CONTRACT and COOLDOWN environment variables are required");
    console.error("");
    console.error("Usage:");
    console.error("  CONTRACT=0x... COOLDOWN=300 npx hardhat run scripts/set-dailykegel-cooldown.ts --network bscTestnet");
    console.error("");
    console.error("Examples:");
    console.error("  CONTRACT=0x... COOLDOWN=300 ...    # 5 minutes");
    console.error("  CONTRACT=0x... COOLDOWN=3600 ...   # 1 hour");
    console.error("  CONTRACT=0x... COOLDOWN=86400 ...  # 24 hours");
    process.exit(1);
  }

  if (!ethers.isAddress(contractAddress)) {
    console.error("Error: Invalid contract address:", contractAddress);
    process.exit(1);
  }

  const cooldownSeconds = parseInt(cooldown);
  if (isNaN(cooldownSeconds) || cooldownSeconds <= 0) {
    console.error("Error: COOLDOWN must be a positive number");
    process.exit(1);
  }

  const [signer] = await ethers.getSigners();

  console.log("Setting cooldown with account:", signer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(signer.address)), "BNB");
  console.log("");

  // 获取合约实例
  const dailyKegel = await ethers.getContractAt("DailyKegel", contractAddress);

  // 检查当前 admin
  const admin = await dailyKegel.admin();
  if (admin.toLowerCase() !== signer.address.toLowerCase()) {
    console.error("Error: Signer is not the admin of this contract");
    console.error("  Contract admin:", admin);
    console.error("  Signer:", signer.address);
    process.exit(1);
  }

  // 获取当前冷却时间
  const currentCooldown = await dailyKegel.cooldown();
  console.log("Current cooldown:", currentCooldown.toString(), "seconds", `(${Number(currentCooldown) / 3600} hours)`);
  console.log("New cooldown:", cooldownSeconds, "seconds", `(${cooldownSeconds / 3600} hours)`);
  console.log("");

  // 设置新冷却时间
  console.log("Setting cooldown...");
  const tx = await dailyKegel.setCooldown(cooldownSeconds);
  console.log("Transaction hash:", tx.hash);

  await tx.wait();

  // 验证
  const updatedCooldown = await dailyKegel.cooldown();
  console.log("");
  console.log("========================================");
  console.log("Cooldown updated successfully!");
  console.log("New cooldown:", updatedCooldown.toString(), "seconds", `(${Number(updatedCooldown) / 3600} hours)`);
  console.log("========================================");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
