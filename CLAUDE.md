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
```

## Architecture

**Tech Stack:**
- Next.js 16 + React 19 (App Router)
- TypeScript strict mode
- wagmi + viem (链上交互)
- XState (训练流程状态机)
- shadcn/ui + Tailwind CSS v4
- Prisma + MariaDB
- Hardhat v3 (智能合约)

**Key Directories:**
- `app/` - Next.js pages，主页为打卡流程
- `components/ui/` - shadcn/ui 组件
- `components/` - 业务组件（TrainingFlow, CheckInSection, Leaderboard, UserStats）
- `lib/` - 工具函数、Prisma 客户端、wagmi 配置
- `lib/abi/` - 合约 ABI（裁剪后供前端使用）
- `lib/config.ts` - 合约地址配置
- `contracts/` - 智能合约独立项目 (Hardhat v3)
- `scripts/` - 快速脚本 (tsx)
- `prisma/` - 数据库 schema
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

**核心功能**：
- 打卡：cooldown 间隔限制，可由管理员配置
- Combo：2×cooldown 内打卡保持连击，超时重置
- 排行榜：combo、打卡次数、捐赠数量（各前 50）
- 事件：CheckIn、ComboEnded（用于历史索引）

ABI 工作流：合约编译后，手动裁剪 ABI 复制到 `lib/abi/`。

## Database

Prisma schema 位于 `prisma/schema.prisma`，生成客户端输出到 `prisma/generated/client/`。

主要用途：管理员功能（combo 历史索引、数据统计）。

## Component Patterns

- shadcn/ui + CVA 变体样式
- `cn()` from `@/lib/utils` 合并 Tailwind 类名
- ConnectWalletDialog 封装钱包连接
- TrainingFlow 使用 XState 状态机管理训练流程

## Environment Variables

```
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...  # DailyKegel 合约地址
NEXT_PUBLIC_TOKEN_ADDRESS=0x...     # UU 代币地址
NEXT_PUBLIC_CHAIN_ID=97             # 链 ID (97=BSC Testnet, 56=BSC Mainnet)
```
