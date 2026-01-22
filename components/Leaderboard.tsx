"use client";

import { useState } from "react";
import { useReadContract } from "wagmi";
import { DailyKegelABI } from "@/lib/abi/DailyKegel";
import { formatUnits } from "viem";

interface Props {
  contractAddress: `0x${string}`;
}

type LeaderboardEntry = {
  user: `0x${string}`;
  value: bigint;
};

export function Leaderboard({ contractAddress }: Props) {
  const [tab, setTab] = useState<"checkin" | "donation">("checkin");

  const { data: checkinLeaderboard } = useReadContract({
    address: contractAddress,
    abi: DailyKegelABI,
    functionName: "getCheckinLeaderboard",
  });

  const { data: donationLeaderboard } = useReadContract({
    address: contractAddress,
    abi: DailyKegelABI,
    functionName: "getDonationLeaderboard",
  });

  const leaderboard = tab === "checkin" ? checkinLeaderboard : donationLeaderboard;
  const filteredLeaderboard = (leaderboard as LeaderboardEntry[] | undefined)?.filter(
    (entry) => entry.user !== "0x0000000000000000000000000000000000000000" && entry.value > 0n
  ) ?? [];

  return (
    <div className="bg-card rounded-lg p-6 border">
      <h3 className="font-semibold mb-4">排行榜</h3>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab("checkin")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === "checkin"
              ? "bg-primary text-primary-foreground"
              : "bg-muted hover:bg-muted/80"
          }`}
        >
          打卡次数
        </button>
        <button
          onClick={() => setTab("donation")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === "donation"
              ? "bg-primary text-primary-foreground"
              : "bg-muted hover:bg-muted/80"
          }`}
        >
          捐赠数量
        </button>
      </div>

      {/* List */}
      {filteredLeaderboard.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">暂无数据</p>
      ) : (
        <div className="space-y-2">
          {filteredLeaderboard.map((entry, index) => (
            <div
              key={entry.user}
              className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    index === 0
                      ? "bg-yellow-400 text-yellow-900"
                      : index === 1
                      ? "bg-gray-300 text-gray-700"
                      : index === 2
                      ? "bg-amber-600 text-amber-100"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {index + 1}
                </span>
                <span className="font-mono text-sm">
                  {entry.user.slice(0, 6)}...{entry.user.slice(-4)}
                </span>
              </div>
              <span className="font-semibold">
                {tab === "checkin"
                  ? entry.value.toString()
                  : `${formatUnits(entry.value, 18)} UU`}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
