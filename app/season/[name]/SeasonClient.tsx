"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { ConnectWalletDialog } from "@/components/ConnectWalletDialog";
import { CheckInSection } from "@/components/CheckInSection";
import { Leaderboard } from "@/components/Leaderboard";
import { UserStats } from "@/components/UserStats";
import Link from "next/link";

interface SeasonData {
  id: number;
  name: string;
  displayName: string;
  contractAddress: string;
  tokenAddress: string;
  chainId: number;
  startTime: number;
  endTime: number;
}

interface Props {
  season: SeasonData;
}

export function SeasonClient({ season }: Props) {
  const [mounted, setMounted] = useState(false);
  const { isConnected } = useAccount();
  const [trainingCompleted, setTrainingCompleted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const startTime = new Date(season.startTime);
  const endTime = new Date(season.endTime);
  const isActive = now >= season.startTime && now < season.endTime;
  const isUpcoming = now < season.startTime;
  const isEnded = now >= season.endTime;

  // 在客户端挂载前，显示未连接状态（与服务端一致）
  const showConnected = mounted && isConnected;

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/" className="text-sm text-muted-foreground hover:underline mb-2 block">
              ← 返回首页
            </Link>
            <h1 className="text-3xl font-bold">{season.displayName}</h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span>
                {startTime.toLocaleDateString("zh-CN")} - {endTime.toLocaleDateString("zh-CN")}
              </span>
              {isActive && (
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                  进行中
                </span>
              )}
              {isUpcoming && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                  即将开始
                </span>
              )}
              {isEnded && (
                <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                  已结束
                </span>
              )}
            </div>
          </div>
          <ConnectWalletDialog />
        </div>

        {/* Main Content */}
        {!showConnected ? (
          <div className="text-center py-20">
            <h2 className="text-2xl font-semibold mb-4">连接钱包开始</h2>
            <p className="text-muted-foreground mb-8">
              请先连接你的钱包以参与本赛季的打卡活动
            </p>
            <div className="inline-block">
              <ConnectWalletDialog />
            </div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left: Training and Check-in */}
            <div className="lg:col-span-2 space-y-8">
              {/* User Stats */}
              <UserStats
                contractAddress={season.contractAddress as `0x${string}`}
                tokenAddress={season.tokenAddress as `0x${string}`}
              />

              {/* Training / Check-in */}
              {isActive && (
                <CheckInSection
                  contractAddress={season.contractAddress as `0x${string}`}
                  tokenAddress={season.tokenAddress as `0x${string}`}
                  trainingCompleted={trainingCompleted}
                  onTrainingComplete={() => setTrainingCompleted(true)}
                />
              )}

              {isUpcoming && (
                <div className="bg-card rounded-lg p-8 text-center">
                  <h3 className="text-xl font-semibold mb-2">赛季尚未开始</h3>
                  <p className="text-muted-foreground">
                    开始时间：{startTime.toLocaleString("zh-CN")}
                  </p>
                </div>
              )}

              {isEnded && (
                <div className="bg-card rounded-lg p-8 text-center">
                  <h3 className="text-xl font-semibold mb-2">赛季已结束</h3>
                  <p className="text-muted-foreground">
                    感谢你的参与！请等待管理员公布结果。
                  </p>
                </div>
              )}
            </div>

            {/* Right: Leaderboard */}
            <div className="space-y-8">
              <Leaderboard
                contractAddress={season.contractAddress as `0x${string}`}
              />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
