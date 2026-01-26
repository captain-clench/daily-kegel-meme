"use client";

import { useState } from "react";
import { useReadContract } from "wagmi";
import { DailyKegelABI } from "@/lib/abi/DailyKegel";
import { formatUnits } from "viem";
import useTrans from "@/hooks/useTrans";

interface Props {
  contractAddress: `0x${string}`;
}

type LeaderboardEntry = {
  user: `0x${string}`;
  value: bigint;
};

type ComboEntry = {
  user: `0x${string}`;
  startBlock: bigint;
  comboCount: bigint;
};

export function Leaderboard({ contractAddress }: Props) {
  const [tab, setTab] = useState<"combo" | "checkin" | "donation">("combo");
  const { t, tCommon } = useTrans("leaderboard");

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

  const { data: comboLeaderboard } = useReadContract({
    address: contractAddress,
    abi: DailyKegelABI,
    functionName: "getComboLeaderboard",
  });

  // 过滤排行榜数据
  const filteredCheckin = (checkinLeaderboard as LeaderboardEntry[] | undefined)?.filter(
    (entry) => entry.user !== "0x0000000000000000000000000000000000000000" && entry.value > 0n
  ) ?? [];

  const filteredDonation = (donationLeaderboard as LeaderboardEntry[] | undefined)?.filter(
    (entry) => entry.user !== "0x0000000000000000000000000000000000000000" && entry.value > 0n
  ) ?? [];

  const filteredCombo = (comboLeaderboard as ComboEntry[] | undefined)?.filter(
    (entry) => entry.user !== "0x0000000000000000000000000000000000000000" && entry.comboCount > 0n
  ) ?? [];

  return (
    <div className="bg-card rounded-lg p-6 border">
      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setTab("combo")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === "combo"
              ? "bg-primary text-primary-foreground"
              : "bg-muted hover:bg-muted/80"
          }`}
        >
          {t("combo_streak")}
        </button>
        <button
          onClick={() => setTab("checkin")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === "checkin"
              ? "bg-primary text-primary-foreground"
              : "bg-muted hover:bg-muted/80"
          }`}
        >
          {t("checkin_count")}
        </button>
        <button
          onClick={() => setTab("donation")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === "donation"
              ? "bg-primary text-primary-foreground"
              : "bg-muted hover:bg-muted/80"
          }`}
        >
          {t("donation_amount")}
        </button>
      </div>

      {/* Combo Leaderboard */}
      {tab === "combo" && (
        <>
          {filteredCombo.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">{tCommon("no_data")}</p>
          ) : (
            <div className="space-y-2">
              {filteredCombo.map((entry, index) => (
                <div
                  key={`${entry.user}-${entry.startBlock}`}
                  className="flex items-center justify-between py-3 px-4 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
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
                    <div>
                      <span className="font-mono text-sm">
                        {entry.user.slice(0, 6)}...{entry.user.slice(-4)}
                      </span>
                      <p className="text-xs text-muted-foreground">
                        #{entry.startBlock.toString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-lg">{entry.comboCount.toString()}</span>
                    <span className="text-sm text-muted-foreground ml-1">{t("streak")}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Check-in Leaderboard */}
      {tab === "checkin" && (
        <>
          {filteredCheckin.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">{tCommon("no_data")}</p>
          ) : (
            <div className="space-y-2">
              {filteredCheckin.map((entry, index) => (
                <div
                  key={entry.user}
                  className="flex items-center justify-between py-3 px-4 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
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
                  <div className="text-right">
                    <span className="font-bold text-lg">{entry.value.toString()}</span>
                    <span className="text-sm text-muted-foreground ml-1">{t("times")}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Donation Leaderboard */}
      {tab === "donation" && (
        <>
          {filteredDonation.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">{tCommon("no_data")}</p>
          ) : (
            <div className="space-y-2">
              {filteredDonation.map((entry, index) => (
                <div
                  key={entry.user}
                  className="flex items-center justify-between py-3 px-4 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
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
                  <span className="font-bold">
                    {formatUnits(entry.value, 18)} UU
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
