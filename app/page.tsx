"use client";

import { useState } from "react";
import { useReadContract, useDisconnect } from "wagmi";
import { CheckInSection } from "@/components/CheckInSection";
import { UserStats } from "@/components/UserStats";
import { Leaderboard } from "@/components/Leaderboard";
import { RoughCard } from "@/components/ui/rough-card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DailyKegelABI } from "@/lib/abi/DailyKegel";
import { CONTRACT_ADDRESS, TOKEN_ADDRESS } from "@/lib/config";
import System from "@/stores/system";
import Web3 from "@/stores/web3";
import { Globe, Check } from "lucide-react";
import useTrans from "@/hooks/useTrans";
import Image from "next/image";
import styles from "./page.module.scss";

function shortenAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function HomePage() {
  const { isConnected, connectedAddress } = Web3.useContainer();
  const { isClient, openWalletConnectDialog } = System.useContainer();
  const { disconnect } = useDisconnect();
  const { t, tCommon, changeLocale, locale } = useTrans("home");
  const [trainingCompleted, setTrainingCompleted] = useState(false);

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
    return date.toLocaleString(locale === "zh" ? "zh-CN" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // 防止 hydration 问题
  if (!isClient) {
    return null;
  }

  return (
    <main className={`min-h-screen ${styles.animatedBg}`}>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <h1 className="text-2xl md:text-3xl font-bold">Captain Clench</h1>
          <div className="flex items-center gap-2">
            {/* Language Switcher */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <Globe className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => changeLocale("zh")} className="flex items-center justify-between">
                  中文
                  {locale === "zh" && <Check className="h-4 w-4 ml-2" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => changeLocale("en")} className="flex items-center justify-between">
                  English
                  {locale === "en" && <Check className="h-4 w-4 ml-2" />}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Wallet Connect */}
            {isConnected && connectedAddress ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    {shortenAddress(connectedAddress)}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => disconnect()}>
                    {tCommon("disconnect")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button onClick={openWalletConnectDialog}>
                {tCommon("connect_wallet")}
              </Button>
            )}
          </div>
        </header>

        {/* Hero Section */}
        <section className="text-center mb-20">
          <Image
            src="/logo.png"
            alt="Captain Clench"
            width={200}
            height={200}
            className="mx-auto mb-6 w-auto h-32 md:h-56"
          />
          <h2 className={`text-3xl md:text-7xl font-bold mb-4 ${styles.titleShadow}`}>
            {t("title")}
          </h2>
          <p className={`text-2lg md:text-3xl text-muted-foreground mb-2 ${styles.titleShadow}`}>
            {t("subtitle")}
          </p>
          <p className={`text-lg md:text-2xl text-muted-foreground max-w-2xl mx-auto ${styles.titleShadow}`}>
            {t("description")}
          </p>
        </section>

        {/* 配置未完成提示 */}
        {!configValid && (
          <section className="mb-8">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
              <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                {t("config_incomplete")}
              </h3>
              <p className="text-yellow-700">
                {t("config_incomplete_desc")}
              </p>
            </div>
          </section>
        )}

        {/* 还没开始提示 */}
        {configValid && !hasStarted && startTime && (
          <section className="mb-8">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
              <h3 className="text-xl font-semibold text-blue-800 mb-2">
                {t("event_coming_soon")}
              </h3>
              <p className="text-blue-700 mb-4">
                {t("start_time", { time: formatStartTime(startTime) })}
              </p>
              <p className="text-blue-600 text-sm">
                {t("stay_tuned")}
              </p>
            </div>
          </section>
        )}

        {/* Main Content */}
        {configValid && hasStarted && (
          <>
            {/* 未连接钱包 */}
            {!isConnected ? (
              <section className="mb-12 max-w-[1200px] mx-auto">
                <RoughCard className="p-12 text-center" roughOptions={{ roughness: 2, bowing: 0.8, fill: '#ffe7e7', fillStyle: 'hachure', hachureGap: 5, fillWeight: 3 }}>
                  <h3 className="text-xl font-semibold mb-4">
                    {t("connect_to_checkin")}
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    {t("connect_to_checkin_desc")}
                  </p>
                  <Button size="lg" onClick={openWalletConnectDialog}>
                    {tCommon("connect_wallet")}
                  </Button>
                </RoughCard>
              </section>
            ) : (
              <section className="mb-12 max-w-[1200px] mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
                  {/* 用户数据 */}
                  <div className="lg:col-span-2">
                    <UserStats
                      contractAddress={CONTRACT_ADDRESS}
                      tokenAddress={TOKEN_ADDRESS}
                    />
                  </div>

                  {/* 打卡区域 */}
                  <div className="lg:col-span-8">
                    <CheckInSection
                      contractAddress={CONTRACT_ADDRESS}
                      tokenAddress={TOKEN_ADDRESS}
                      trainingCompleted={trainingCompleted}
                      onTrainingComplete={() => setTrainingCompleted(true)}
                    />
                  </div>
                </div>
              </section>
            )}

            {/* 排行榜 */}
            <section>
              <h2 className="text-2xl font-bold text-center mb-6">
                {t("leaderboard")}
              </h2>
              <Leaderboard contractAddress={CONTRACT_ADDRESS} />
            </section>
          </>
        )}

        {/* How it works (当配置有效时始终显示) */}
        {configValid && (
          <section className="mt-16 mb-8">
            <h2 className="text-2xl font-bold text-center mb-8">
              {t("how_to_participate")}
            </h2>
            <div className="grid md:grid-cols-4 gap-6 max-w-[1200px] mx-auto">
              <RoughCard className="p-6 text-center" roughOptions={{ roughness: 2, bowing: 0.8, fill: '#fff8e1', fillStyle: 'hachure', hachureGap: 5, fillWeight: 3 }}>
                <div className="text-3xl mb-3">1</div>
                <h3 className="font-semibold mb-2">{t("step1_title")}</h3>
                <p className="text-sm text-muted-foreground">
                  {t("step1_desc")}
                </p>
              </RoughCard>
              <RoughCard className="p-6 text-center" roughOptions={{ roughness: 2, bowing: 0.8, fill: '#e8f5e9', fillStyle: 'hachure', hachureGap: 5, fillWeight: 3 }}>
                <div className="text-3xl mb-3">2</div>
                <h3 className="font-semibold mb-2">{t("step2_title")}</h3>
                <p className="text-sm text-muted-foreground">
                  {t("step2_desc")}
                </p>
              </RoughCard>
              <RoughCard className="p-6 text-center" roughOptions={{ roughness: 2, bowing: 0.8, fill: '#e3f2fd', fillStyle: 'hachure', hachureGap: 5, fillWeight: 3 }}>
                <div className="text-3xl mb-3">3</div>
                <h3 className="font-semibold mb-2">{t("step3_title")}</h3>
                <p className="text-sm text-muted-foreground">
                  {t("step3_desc")}
                </p>
              </RoughCard>
              <RoughCard className="p-6 text-center" roughOptions={{ roughness: 2, bowing: 0.8, fill: '#fce4ec', fillStyle: 'hachure', hachureGap: 5, fillWeight: 3 }}>
                <div className="text-3xl mb-3">4</div>
                <h3 className="font-semibold mb-2">{t("step4_title")}</h3>
                <p className="text-sm text-muted-foreground">
                  {t("step4_desc")}
                </p>
              </RoughCard>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
