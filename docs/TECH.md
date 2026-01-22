# DailyKegel 技术规划

## 环境要求

- **Node.js**: >= 22.10（Hardhat v3 要求）
- **包管理**: yarn

## 技术栈

### 前端
- **框架**: Next.js 16 (App Router)
- **UI**: shadcn/ui + Tailwind CSS v4
- **链上交互**: wagmi + viem
- **钱包连接**: wagmi 内置 + ConnectWalletDialog 组件
- **类型**: TypeScript (strict mode)

### 智能合约
- **框架**: Hardhat v3.1.5
- **语言**: Solidity 0.8.28
- **模块类型**: ES Module
- **测试**: Mocha + Chai + ethers v6
- **部署**: Hardhat Ignition
- **测试网络**: 本地 Hardhat 节点 (edr-simulated)
- **正式网络**: BSC (Binance Smart Chain)
- **Node 版本要求**: >= 22.10（当前使用 24.11）

### 数据库
- **ORM**: Prisma + MariaDB
- **用途**: 管理员功能（Merkle 数据存储、用户 claim 查询等）

### 工具
- **脚本执行**: tsx
- **包管理**: yarn

## 目录结构

```
kegel-exercises-meme/
├── app/                    # Next.js App Router
│   └── season1/            # 第一赛季页面
├── components/
│   └── ui/                 # shadcn/ui 组件
├── lib/
│   ├── abi/                # 合约 ABI（裁剪后）
│   ├── prisma.ts           # Prisma 客户端
│   ├── utils.ts            # 工具函数
│   └── wagmi/              # wagmi 配置
├── contracts/              # 智能合约独立项目 (Hardhat v3)
│   ├── contracts/          # Solidity 源码
│   │   ├── UUToken.sol
│   │   └── DailyKegel.sol
│   ├── ignition/modules/   # Hardhat Ignition 部署模块
│   ├── test/               # 合约测试 (Mocha + Chai)
│   ├── artifacts/          # 编译产物
│   ├── hardhat.config.ts   # Hardhat 配置
│   └── package.json        # 独立依赖 (ES Module)
├── scripts/                # 快速脚本
│   └── example.ts
├── prisma/
│   └── schema.prisma
└── docs/
    ├── PROJECT.md
    └── TECH.md
```

## 开发命令

### 前端
```bash
yarn dev                    # 启动开发服务器
yarn build                  # 构建生产版本
yarn lint                   # 代码检查
```

### 智能合约 (在 contracts/ 目录下)
```bash
npx hardhat compile                              # 编译合约
npx hardhat test                                 # 运行测试
npx hardhat node                                 # 启动本地节点
npx hardhat ignition deploy ignition/modules/XXX.ts --network hardhatMainnet  # 部署
```

### 脚本
```bash
yarn script scripts/xxx.ts arg1 arg2
```

### 数据库
```bash
yarn prisma generate        # 生成 Prisma 客户端
yarn prisma db push         # 同步 schema 到数据库
```

## 合约与前端集成

### ABI 共享
- 合约编译后，手动复制裁剪后的 ABI 到 `lib/abi/` 目录
- 只保留前端需要的函数，减少包体积

### 合约地址管理
- 开发环境：`.env` 配置
- 多赛季支持：数据库存储各赛季合约地址

### 本地开发流程
1. 启动本地 Hardhat 节点：`cd contracts && npx hardhat node`
2. 部署合约到本地：`npx hardhat ignition deploy ignition/modules/XXX.ts --network hardhatMainnet`
3. 更新 `.env` 中的合约地址
4. 启动前端：`yarn dev`
5. 前端连接本地网络进行测试

## Hardhat v3 配置

### 网络配置 (hardhat.config.ts)
- `hardhatMainnet` - 本地 L1 模拟节点 (edr-simulated)
- `hardhatOp` - 本地 OP 模拟节点
- `sepolia` - Sepolia 测试网 (需配置 RPC URL 和私钥)
- 待添加：BSC 主网、BSC Testnet

### Solidity 编译配置
- `default` profile: Solidity 0.8.28，无优化
- `production` profile: Solidity 0.8.28，optimizer enabled (runs: 200)

## wagmi 配置要点

- 支持 BSC 主网 + BSC Testnet + 本地 Hardhat 网络
- ConnectWalletDialog 封装钱包连接逻辑

## Prisma 数据模型（预期）

```prisma
model Season {
  id              Int      @id @default(autoincrement())
  name            String   @unique  # 如 "season1"
  contractAddress String   # 合约地址
  tokenAddress    String   # UU 代币地址
  startTime       DateTime
  endTime         DateTime
  active          Boolean  @default(true)
  createdAt       DateTime @default(now())
}

model MerkleData {
  id          Int      @id @default(autoincrement())
  season      String   # 赛季标识
  address     String   # 用户地址
  amount      String   # 可 claim 数量
  proof       Json     # Merkle proof
  createdAt   DateTime @default(now())

  @@unique([season, address])
}
```

## 待实现模块

### 智能合约
- [ ] UUToken.sol - ERC20 测试代币
- [ ] DailyKegel.sol - 赛季主合约

### 前端组件
- [ ] ConnectWalletDialog - 钱包连接
- [ ] TrainingFlow - 训练流程引导
- [ ] CheckInButton - 打卡按钮
- [ ] Countdown - 倒计时显示
- [ ] Leaderboard - 排行榜
- [ ] UserStats - 个人数据
- [ ] ClaimReward - 领取奖励

### 脚本
- [ ] generate-merkle.ts - 生成 Merkle Tree
- [ ] export-leaderboard.ts - 导出排行榜数据
