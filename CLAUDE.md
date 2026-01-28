# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Captain Clench / 肛铁侠** - BSC DApp 激励用户每日凯格尔运动打卡，支持 Combo 连击机制。详见 `docs/PROJECT.md` 和 `docs/TECH.md`。

## Build & Development Commands

**前端:**
```bash
yarn dev          # Start dev server on http://localhost:3000
yarn build        # Build production bundle
yarn lint         # Run ESLint
```

**脚本:**
```bash
yarn script scripts/xxx.ts arg1 arg2    # 运行 tsx 脚本
```

**数据库:**
```bash
yarn prisma generate      # Generate Prisma client
yarn prisma db push       # Sync schema to database
```

**智能合约 (在 contracts/ 目录下执行):**
```bash
npx hardhat compile       # 编译合约
npx hardhat test          # 运行测试
npx hardhat node          # 启动本地节点

# 部署脚本
npx hardhat run scripts/deploy-bsc-testnet.ts --network bscTestnet
COOLDOWN=300 npx hardhat run scripts/deploy-bsc-testnet.ts --network bscTestnet  # 自定义冷却时间

# 单独部署 DailyKegel
UU_TOKEN=0x... npx hardhat run scripts/deploy-dailykegel.ts --network bscTestnet
COOLDOWN=600 UU_TOKEN=0x... npx hardhat run scripts/deploy-dailykegel.ts --network bscTestnet

# 修改冷却时间
CONTRACT=0x... COOLDOWN=300 npx hardhat run scripts/set-dailykegel-cooldown.ts --network bscTestnet
```

## Architecture

**Tech Stack:**
- Next.js 16 + React 19 (App Router)
- TypeScript strict mode
- wagmi + viem (链上交互)
- XState (训练流程状态机)
- shadcn/ui + Tailwind CSS v4
- roughjs + react-rough-notation (手绘风格 UI)
- marked-react (Markdown 渲染)
- Prisma + MariaDB
- Hardhat v3 (智能合约)

**Key Directories:**
- `app/` - Next.js pages，主页为打卡流程
- `app/api/` - API 路由（quote 管理）
- `components/ui/` - UI 组件（shadcn/ui + 自定义 Rough 组件）
- `components/` - 业务组件（TrainingFlow, CheckInSection, Leaderboard, UserStats）
- `lib/` - 工具函数、Prisma 客户端、wagmi 配置
- `lib/abi/` - 合约 ABI（裁剪后供前端使用）
- `lib/config.ts` - 合约地址配置
- `contracts/` - 智能合约独立项目 (Hardhat v3)
- `contracts/scripts/` - 合约部署和管理脚本
- `prisma/` - 数据库 schema
- `i18n/` - 国际化翻译文件 (zh.json, en.json)
- `docs/` - 项目文档

**Path Aliasing:** `@/*` 映射到项目根目录

## Smart Contracts

合约项目独立于前端，有自己的 package.json（ES Module）。

**环境要求**:
- Node.js >= 22.10
- Hardhat v3.1.5
- Solidity 0.8.28

**Hardhat v3 特性**:
- 使用 `network.connect()` 获取 ethers 实例
- 使用 Hardhat Ignition 进行部署
- 测试使用 top-level await

合约列表：
- `UUToken.sol` - ERC20 测试代币
- `DailyKegel.sol` - 主合约（打卡、Combo、排行榜）

**DailyKegel 构造函数参数**：
- `_uuToken` - UU 代币地址
- `_startTime` - 开始时间戳
- `_cooldown` - 冷却时间（秒）

**核心功能**：
- 打卡：cooldown 间隔限制，可由管理员配置
- Combo：2×cooldown 内打卡保持连击，超时重置
- 排行榜：combo、打卡次数、捐赠数量（各前 50）
- 事件：CheckIn、ComboEnded（用于历史索引）

ABI 工作流：合约编译后，手动裁剪 ABI 复制到 `lib/abi/`。

## Database

Prisma schema 位于 `prisma/schema.prisma`，生成客户端输出到 `prisma/generated/client/`。

**数据表：**
- `Quote` - 排行榜用户留言（address unique, quote text）

## API Routes

**POST /api/quote** - 保存/更新用户留言
- 请求：`{ address, nonce, signature, quote }`
- 需要钱包签名验证

**POST /api/quote/batch_query** - 批量查询留言
- 请求：`{ addresses: string[] }`
- 响应：`{ success: true, data: { [address]: quote } }`

## Component Patterns

- shadcn/ui + CVA 变体样式
- `cn()` from `@/lib/utils` 合并 Tailwind 类名
- ConnectWalletDialog 封装钱包连接
- TrainingFlow 使用 XState 状态机管理训练流程（包含 idle/preparing/running/paused/complete 状态）

### RoughCard 组件

手绘风格卡片组件，基于 roughjs 实现。

```tsx
import { RoughCard } from "@/components/ui/rough-card";

<RoughCard
  className="p-6"
  roughOptions={{
    roughness: 2,          // 粗糙度
    bowing: 0.8,           // 弯曲度
    stroke: "#333",        // 边框颜色
    strokeWidth: 2,        // 边框宽度
    fill: "#ffe7e7",       // 填充颜色
    fillStyle: "hachure",  // 填充样式: hachure/solid/zigzag/cross-hatch/dots/dashed
    fillWeight: 3,         // 填充线条粗细
    hachureGap: 5,         // 填充线条间距
    hachureAngle: 45,      // 填充线条角度
    seed: 1,               // 随机种子
  }}
  animate                  // 启用抖动动画
  animateInterval={150}    // 抖动间隔（毫秒）
  solidBackgroundFill="#ffffff"  // solid 背景垫底颜色
>
  内容
</RoughCard>
```

### RoughTabs 组件

手绘风格 Tabs 组件，基于 react-rough-notation 实现 bracket 效果。

```tsx
import { RoughTabs, RoughTabsList, RoughTabsTrigger, RoughTabsContent } from "@/components/ui/rough-tabs";

<RoughTabs defaultValue="tab1">
  <RoughTabsList>
    <RoughTabsTrigger value="tab1" color="#333" strokeWidth={2}>Tab 1</RoughTabsTrigger>
    <RoughTabsTrigger value="tab2">Tab 2</RoughTabsTrigger>
  </RoughTabsList>
  <RoughTabsContent value="tab1">内容 1</RoughTabsContent>
  <RoughTabsContent value="tab2">内容 2</RoughTabsContent>
</RoughTabs>
```

### RoughFinishIcon 组件

手绘风格完成图标（勾选），基于 roughjs 实现。

```tsx
import { RoughFinishIcon } from "@/components/RoughFinishIcon";

<RoughFinishIcon
  size={80}
  color="#22c55e"
  strokeWidth={2}
  roughness={1.2}
  animate              // 启用抖动动画
  animateInterval={150}
/>
```

### Leaderboard 组件

排行榜组件，包含：
- 冠军展示卡片（三榜第一名，带称号）
- RoughTabs 切换三个榜单
- RoughRankIcon 排名图标（支持 size 属性）
- 用户 Quote 功能（支持 Markdown，需签名验证）
- 当前用户高亮（RoughNotation highlight）

## Environment Variables

```
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...  # DailyKegel 合约地址
NEXT_PUBLIC_TOKEN_ADDRESS=0x...     # UU 代币地址
NEXT_PUBLIC_CHAIN_ID=97             # 链 ID (97=BSC Testnet, 56=BSC Mainnet)

# 数据库 (Prisma)
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_USER=root
DATABASE_PASSWORD=xxx
DATABASE_NAME=captain_clench
```
