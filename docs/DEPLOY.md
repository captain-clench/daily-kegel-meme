# Captain Clench / 肛铁侠 合约部署指南

## 前置要求

- Node.js >= 22.10
- 部署账户需要有足够的 BNB 支付 gas 费用
- 已部署的 UU 代币合约地址

## 环境配置

### 1. 安装依赖

```bash
cd contracts
npm install
# 或
yarn
```

### 2. 配置私钥

在 `contracts/.env` 文件中配置部署账户私钥：

```bash
# BSC 测试网
BSC_TESTNET_PRIVATE_KEY=你的私钥

# BSC 主网
BSC_PRIVATE_KEY=你的私钥
```

> 注意：私钥不要带 `0x` 前缀也可以

### 3. 获取测试网 BNB

BSC 测试网水龙头：https://www.bnbchain.org/en/testnet-faucet

## 编译合约

```bash
cd contracts

# 开发环境编译
npx hardhat compile

# 生产环境编译（启用优化）
NODE_ENV=production npx hardhat compile
```

## 部署合约

### 部署到 BSC 测试网

```bash
UU_TOKEN=<UU代币地址> npx hardhat run scripts/deploy-dailykegel.ts --network bscTestnet
```

示例：
```bash
UU_TOKEN=0xadC13f83dc5A6D05BC19DB301d18630dE4C8146a npx hardhat run scripts/deploy-dailykegel.ts --network bscTestnet
```

### 部署到 BSC 主网

```bash
NODE_ENV=production UU_TOKEN=<UU代币地址> npx hardhat run scripts/deploy-dailykegel.ts --network bsc
```

### 环境变量说明

| 环境变量 | 说明 | 是否必填 |
|---------|------|---------|
| `UU_TOKEN` | UU 代币合约地址 | 是 |
| `START_TIME` | 开始时间（Unix 时间戳） | 否，默认当前时间 |

指定开始时间的示例：
```bash
START_TIME=1706000000 UU_TOKEN=0x... npx hardhat run scripts/deploy-dailykegel.ts --network bscTestnet
```

### 部署输出

部署成功后会输出：
- 合约地址
- 验证命令

```
========================================
DailyKegel deployed successfully!
Contract address: 0x...
========================================

Verify on BscScan:
  npx hardhat verify --network bscTestnet 0x... 0x... 1234567890
```

## 验证合约

部署成功后，使用输出的验证命令在 BscScan 上验证合约源码：

```bash
npx hardhat verify --network bscTestnet <合约地址> <UU代币地址> <开始时间戳>
```

## 部署后配置

### 设置冷却时间（可选）

默认冷却时间为 24 小时。如需修改（如测试时设为 1 分钟）：

```javascript
// 调用合约的 setCooldown 函数
await dailyKegel.setCooldown(60); // 60 秒
```

### 修改开始时间（可选）

如需延迟开始时间：

```javascript
// 调用合约的 setStartTime 函数
await dailyKegel.setStartTime(newTimestamp);
```

> 注意：开始时间不能设置为过去的时间

## 已部署合约地址

### BSC 测试网

| 合约 | 地址 |
|------|------|
| UU Token | `0xadC13f83dc5A6D05BC19DB301d18630dE4C8146a` |
| DailyKegel | 待部署 |

### BSC 主网

| 合约 | 地址 |
|------|------|
| UU Token | 待定 |
| DailyKegel | 待部署 |

## 常见问题

### 1. 部署失败：insufficient funds

确保部署账户有足够的 BNB 支付 gas 费用。

### 2. 部署失败：nonce too low

可能是之前的交易还在 pending，等待一段时间后重试。

### 3. 验证失败

确保：
- 编译时使用的 Solidity 版本与部署时一致
- 构造函数参数正确
- 如果是生产环境部署，验证时也需要启用优化器
