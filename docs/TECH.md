# Captain Clench / 肛铁侠 技术规划

## 环境要求

- **Node.js**: >= 22.10（Hardhat v3 要求）
- **包管理**: yarn

## 技术栈

### 前端
- **框架**: Next.js 16 (App Router)
- **UI**: shadcn/ui + Tailwind CSS v4
- **链上交互**: wagmi + viem
- **状态管理**: XState（训练流程状态机）
- **钱包连接**: wagmi 内置 + ConnectWalletDialog 组件
- **类型**: TypeScript (strict mode)

### 智能合约
- **框架**: Hardhat v3.1.5
- **语言**: Solidity 0.8.28
- **模块类型**: ES Module
- **测试**: Mocha + Chai + ethers v6
- **部署**: Hardhat Ignition
- **测试网络**: BSC Testnet (chainId: 97)
- **正式网络**: BSC Mainnet (chainId: 56)
- **Node 版本要求**: >= 22.10

### 数据库
- **ORM**: Prisma + MariaDB
- **用途**: 管理员功能（combo 历史索引、数据统计等）

### 工具
- **脚本执行**: tsx
- **包管理**: yarn

## 目录结构

```
kegel-exercises-meme/
├── app/                    # Next.js App Router
│   └── page.tsx            # 主页（打卡流程）
├── components/
│   ├── ui/                 # shadcn/ui 组件
│   ├── TrainingFlow.tsx    # 训练流程（XState 状态机）
│   ├── CheckInSection.tsx  # 打卡区域
│   ├── Leaderboard.tsx     # 排行榜（combo/打卡/捐赠）
│   └── UserStats.tsx       # 个人数据
├── lib/
│   ├── abi/                # 合约 ABI（裁剪后）
│   ├── config.ts           # 合约地址配置
│   ├── prisma.ts           # Prisma 客户端
│   ├── utils.ts            # 工具函数
│   └── wagmi/              # wagmi 配置
├── contracts/              # 智能合约独立项目 (Hardhat v3)
│   ├── contracts/          # Solidity 源码
│   │   ├── UUToken.sol
│   │   └── DailyKegel.sol
│   ├── ignition/modules/   # Hardhat Ignition 部署模块
│   ├── scripts/            # 部署脚本
│   ├── test/               # 合约测试 (Mocha + Chai)
│   ├── artifacts/          # 编译产物
│   ├── hardhat.config.ts   # Hardhat 配置
│   └── package.json        # 独立依赖 (ES Module)
├── scripts/                # 快速脚本
├── prisma/
│   └── schema.prisma
└── docs/
    ├── PROJECT.md          # 项目说明
    ├── TECH.md             # 技术规划
    └── DEPLOY.md           # 部署指南
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
npx hardhat compile         # 编译合约
npx hardhat test            # 运行测试
npx hardhat node            # 启动本地节点
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
- 通过 `.env` 配置：
  - `NEXT_PUBLIC_CONTRACT_ADDRESS` - DailyKegel 合约地址
  - `NEXT_PUBLIC_TOKEN_ADDRESS` - UU 代币地址
  - `NEXT_PUBLIC_CHAIN_ID` - 链 ID（97 测试网，56 主网）

### 部署流程
详见 `docs/DEPLOY.md`

## Hardhat v3 配置

### 网络配置 (hardhat.config.ts)
- `hardhatMainnet` - 本地 L1 模拟节点 (edr-simulated)
- `bscTestnet` - BSC 测试网 (chainId: 97)
- `bsc` - BSC 主网 (chainId: 56)

### Solidity 编译配置
- `default` profile: Solidity 0.8.28，无优化
- `production` profile: Solidity 0.8.28，optimizer enabled (runs: 200)

## wagmi 配置要点

- 支持 BSC 主网 + BSC Testnet + 本地 Hardhat 网络
- ConnectWalletDialog 封装钱包连接逻辑

## 已实现功能

### 智能合约
- [x] UUToken.sol - ERC20 测试代币
- [x] DailyKegel.sol - 主合约
  - [x] 打卡功能（cooldown 间隔限制）
  - [x] Combo 连击机制
  - [x] 三个排行榜（combo、打卡次数、捐赠数量）
  - [x] ComboEnded 事件（用于历史索引）

### 前端组件
- [x] ConnectWalletDialog - 钱包连接
- [x] TrainingFlow - 训练流程引导（XState 状态机）
- [x] CheckInSection - 打卡区域
- [x] Leaderboard - 排行榜（三个 tab）
- [x] UserStats - 个人数据

### 待实现
- [ ] combo 历史索引脚本
- [ ] 管理员后台
