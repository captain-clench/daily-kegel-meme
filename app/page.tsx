"use client";

import { useState, useEffect } from "react";
import { useAccount, useReadContract } from "wagmi";
import { ConnectWalletDialog } from "@/components/ConnectWalletDialog";
import { CheckInSection } from "@/components/CheckInSection";
import { UserStats } from "@/components/UserStats";
import { Leaderboard } from "@/components/Leaderboard";
import { DailyKegelABI } from "@/lib/abi/DailyKegel";
import { CONTRACT_ADDRESS, TOKEN_ADDRESS } from "@/lib/config";

export default function HomePage() {
  const { isConnected, address } = useAccount();
  const [trainingCompleted, setTrainingCompleted] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 读取合约 startTime
  const { data: startTime } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: DailyKegelABI,
    functionName: "startTime",
    query: { enabled: !!CONTRACT_ADDRESS && CONTRACT_ADDRESS !== "0x待部署的合约地址" as `0x${string}` },
  });

  const now = Math.floor(Date.now() / 1000);
  const hasStarted = startTime ? now >= Number(startTime) : false;
  const configValid = CONTRACT_ADDRESS && CONTRACT_ADDRESS !== "0x待部署的合约地址" as `0x${string}`;

  // 格式化开始时间
  const formatStartTime = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleString("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // 防止 hydration 问题
  if (!mounted) {
    return null;
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <h1 className="text-2xl md:text-3xl font-bold">DailyKegel</h1>
          <ConnectWalletDialog />
        </header>

        {/* Hero Section */}
        <section className="text-center mb-12">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            每日凯格尔运动
          </h2>
          <p className="text-lg text-muted-foreground mb-2">
            锻炼盆底肌群，增强身体健康
          </p>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            完成训练后打卡，积累 Combo 连击，登上排行榜！
          </p>
        </section>

        {/* 配置未完成提示 */}
        {!configValid && (
          <section className="mb-8">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
              <h3 className="text-lg font-semibold text-yellow-800 mb-2">配置未完成</h3>
              <p className="text-yellow-700">
                请在 .env 文件中配置 NEXT_PUBLIC_CONTRACT_ADDRESS
              </p>
            </div>
          </section>
        )}

        {/* 还没开始提示 */}
        {configValid && !hasStarted && startTime && (
          <section className="mb-8">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
              <h3 className="text-xl font-semibold text-blue-800 mb-2">活动即将开始</h3>
              <p className="text-blue-700 mb-4">
                开始时间：{formatStartTime(startTime)}
              </p>
              <p className="text-blue-600 text-sm">
                敬请期待！
              </p>
            </div>
          </section>
        )}

        {/* Main Content */}
        {configValid && hasStarted && (
          <>
            {/* 未连接钱包 */}
            {!isConnected ? (
              <section className="mb-12">
                <div className="bg-card rounded-lg p-12 text-center border">
                  <h3 className="text-xl font-semibold mb-4">连接钱包开始打卡</h3>
                  <p className="text-muted-foreground mb-6">
                    连接你的钱包，开始每日凯格尔训练
                  </p>
                  <ConnectWalletDialog />
                </div>
              </section>
            ) : (
              <>
                {/* 用户数据 */}
                <section className="mb-8">
                  <UserStats
                    contractAddress={CONTRACT_ADDRESS}
                    tokenAddress={TOKEN_ADDRESS}
                  />
                </section>

                {/* 打卡区域 */}
                <section className="mb-12">
                  <CheckInSection
                    contractAddress={CONTRACT_ADDRESS}
                    tokenAddress={TOKEN_ADDRESS}
                    trainingCompleted={trainingCompleted}
                    onTrainingComplete={() => setTrainingCompleted(true)}
                  />
                </section>
              </>
            )}

            {/* 排行榜 */}
            <section>
              <h2 className="text-2xl font-bold text-center mb-6">排行榜</h2>
              <Leaderboard contractAddress={CONTRACT_ADDRESS} />
            </section>
          </>
        )}

        {/* How it works (当配置有效时始终显示) */}
        {configValid && (
          <section className="mt-16 mb-8">
            <h2 className="text-2xl font-bold text-center mb-8">如何参与</h2>
            <div className="grid md:grid-cols-4 gap-6">
              <div className="bg-card rounded-lg p-6 text-center border">
                <div className="text-3xl mb-3">1</div>
                <h3 className="font-semibold mb-2">连接钱包</h3>
                <p className="text-sm text-muted-foreground">
                  使用 MetaMask 等钱包连接 BSC 网络
                </p>
              </div>
              <div className="bg-card rounded-lg p-6 text-center border">
                <div className="text-3xl mb-3">2</div>
                <h3 className="font-semibold mb-2">完成训练</h3>
                <p className="text-sm text-muted-foreground">
                  跟随指引完成凯格尔训练
                </p>
              </div>
              <div className="bg-card rounded-lg p-6 text-center border">
                <div className="text-3xl mb-3">3</div>
                <h3 className="font-semibold mb-2">每日打卡</h3>
                <p className="text-sm text-muted-foreground">
                  捐赠 UU 代币完成打卡
                </p>
              </div>
              <div className="bg-card rounded-lg p-6 text-center border">
                <div className="text-3xl mb-3">4</div>
                <h3 className="font-semibold mb-2">保持 Combo</h3>
                <p className="text-sm text-muted-foreground">
                  连续打卡累积 Combo，登上排行榜
                </p>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
