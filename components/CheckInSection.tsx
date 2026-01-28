"use client";

import { useState, useEffect } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { maxInt256, parseUnits } from "viem";
import { DailyKegelABI } from "@/lib/abi/DailyKegel";
import { ERC20ABI } from "@/lib/abi/ERC20";
import { Button } from "@/components/ui/button";
import { RoughCard } from "@/components/ui/rough-card";
import { TrainingFlow } from "@/components/TrainingFlow";
import useTrans from "@/hooks/useTrans";

interface Props {
  contractAddress: `0x${string}`;
  tokenAddress: `0x${string}`;
  trainingCompleted: boolean;
  onTrainingComplete: () => void;
}

// 格式化时间显示
function formatDateTime(timestamp: number, locale: string) {
  const date = new Date(timestamp * 1000);
  return date.toLocaleString(locale === "zh" ? "zh-CN" : "en-US", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// 格式化倒计时
function formatCountdown(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function CheckInSection({
  contractAddress,
  tokenAddress,
  trainingCompleted,
  onTrainingComplete,
}: Props) {
  const { address } = useAccount();
  const { t, locale } = useTrans("checkin");
  const [donationAmount, setDonationAmount] = useState("1");

  const { data: canCheckIn, refetch: refetchCanCheckIn } = useReadContract({
    address: contractAddress,
    abi: DailyKegelABI,
    functionName: "canCheckIn",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: nextCheckinTime, refetch: refetchNextCheckinTime } = useReadContract({
    address: contractAddress,
    abi: DailyKegelABI,
    functionName: "nextCheckinTime",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: comboDeadline, refetch: refetchComboDeadline } = useReadContract({
    address: contractAddress,
    abi: DailyKegelABI,
    functionName: "comboDeadline",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: userData } = useReadContract({
    address: contractAddress,
    abi: DailyKegelABI,
    functionName: "userData",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: tokenAddress,
    abi: ERC20ABI,
    functionName: "allowance",
    args: address ? [address, contractAddress] : undefined,
    query: { enabled: !!address },
  });

  const { writeContract: approve, data: approveHash, isPending: isApproving } = useWriteContract();
  const { writeContract: checkIn, data: checkInHash, isPending: isCheckingIn } = useWriteContract();

  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({
    hash: approveHash,
  });

  const { isLoading: isCheckInConfirming, isSuccess: isCheckInSuccess } = useWaitForTransactionReceipt({
    hash: checkInHash,
  });

  useEffect(() => {
    if (isApproveSuccess) {
      refetchAllowance();
    }
  }, [isApproveSuccess, refetchAllowance]);

  useEffect(() => {
    if (isCheckInSuccess) {
      refetchCanCheckIn();
      refetchNextCheckinTime();
      refetchComboDeadline();
    }
  }, [isCheckInSuccess, refetchCanCheckIn, refetchNextCheckinTime, refetchComboDeadline]);

  const donationInWei = parseUnits(donationAmount || "0", 18);
  const needsApproval = !allowance || allowance < donationInWei;
  const currentCombo = userData?.[3] ?? 0n;
  const hasCheckedInBefore = userData?.[2] ? Number(userData[2]) > 0 : false;

  const handleApprove = () => {
    approve({
      address: tokenAddress,
      abi: ERC20ABI,
      functionName: "approve",
      args: [contractAddress, maxInt256],
    });
  };

  const handleCheckIn = () => {
    checkIn({
      address: contractAddress,
      abi: DailyKegelABI,
      functionName: "checkIn",
      args: [donationInWei],
    });
  };

  // Countdown timers
  const [cooldownCountdown, setCooldownCountdown] = useState("");
  const [comboCountdown, setComboCountdown] = useState("");

  useEffect(() => {
    const updateCountdowns = () => {
      const now = Math.floor(Date.now() / 1000);

      // 冷却倒计时
      if (nextCheckinTime && !canCheckIn) {
        const target = Number(nextCheckinTime);
        const diff = target - now;
        if (diff > 0) {
          setCooldownCountdown(formatCountdown(diff));
        } else {
          setCooldownCountdown("");
          refetchCanCheckIn();
        }
      } else {
        setCooldownCountdown("");
      }

      // Combo 截止倒计时
      if (comboDeadline && Number(comboDeadline) > 0) {
        const target = Number(comboDeadline);
        const diff = target - now;
        if (diff > 0) {
          setComboCountdown(formatCountdown(diff));
        } else {
          setComboCountdown("");
        }
      } else {
        setComboCountdown("");
      }
    };

    updateCountdowns();
    const interval = setInterval(updateCountdowns, 1000);
    return () => clearInterval(interval);
  }, [nextCheckinTime, comboDeadline, canCheckIn, refetchCanCheckIn]);

  // 判断是否在 combo 有效期内
  const now = Math.floor(Date.now() / 1000);
  const isInComboWindow = comboDeadline && Number(comboDeadline) > now;

  // 如果在冷却时间内，显示倒计时
  if (!canCheckIn && cooldownCountdown) {
    return (
      <RoughCard className="p-8 h-full text-center" roughOptions={{ roughness: 2, bowing: 0.8, fill: '#ffe7e7', fillStyle: 'hachure', hachureGap: 5, fillWeight: 3 }}>
        <h3 className="text-xl font-semibold mb-2">{t("checked_in_today")}</h3>

        {/* 当前 Combo */}
        {currentCombo > 0n && (
          <div className="mb-4">
            <span className="text-sm text-muted-foreground">{t("current_combo")}</span>
            <p className="text-3xl font-bold text-primary">{currentCombo.toString()}</p>
          </div>
        )}

        {/* 下次打卡倒计时 */}
        <div className="mb-4">
          <p className="text-sm text-muted-foreground mb-1">{t("next_checkin_countdown")}</p>
          <p className="text-4xl font-mono font-bold">{cooldownCountdown}</p>
          {nextCheckinTime && (
            <p className="text-xs text-muted-foreground mt-1">
              {t("can_checkin_at", { time: formatDateTime(Number(nextCheckinTime), locale) })}
            </p>
          )}
        </div>

        {/* Combo 截止时间 */}
        {isInComboWindow && comboCountdown && (
          <div className="mt-6 p-4 bg-green-50 dark:bg-green-950 rounded-lg">
            <p className="text-sm text-green-700 dark:text-green-300 mb-1">
              {t("combo_deadline")}
            </p>
            <p className="text-2xl font-mono font-bold text-green-600 dark:text-green-400">
              {comboCountdown}
            </p>
            {comboDeadline && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                {t("combo_deadline_hint", { time: formatDateTime(Number(comboDeadline), locale) })}
              </p>
            )}
          </div>
        )}
      </RoughCard>
    );
  }

  // 如果可以打卡且训练未完成，显示训练组件
  if (!trainingCompleted && canCheckIn) {
    return (
      <TrainingFlow
        onComplete={onTrainingComplete}
        currentCombo={currentCombo}
        hasCheckedInBefore={hasCheckedInBefore}
        isInComboWindow={!!isInComboWindow}
        comboCountdown={comboCountdown}
      />
    );
  }

  // 训练完成，显示打卡表单
  if (trainingCompleted && canCheckIn) {
    return (
      <RoughCard className="p-8 h-full" roughOptions={{ roughness: 2, bowing: 0.8, fill: '#c5ddff', fillStyle: 'hachure', hachureGap: 5, fillWeight: 3 }}>
        <h3 className="text-xl font-semibold mb-4 text-center">{t("training_complete")}</h3>

        {/* Combo 提示 */}
        {hasCheckedInBefore && isInComboWindow && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-950 rounded-lg text-center">
            <p className="text-sm text-green-700 dark:text-green-300">
              {t("current_combo")}: <span className="font-bold">{currentCombo.toString()}</span>
            </p>
            <p className="text-sm text-green-600 dark:text-green-400 mt-1">
              {t("combo_will_be", { combo: (currentCombo + 1n).toString() })}
            </p>
          </div>
        )}

        {hasCheckedInBefore && !isInComboWindow && (
          <div className="mb-6 p-4 bg-orange-50 dark:bg-orange-950 rounded-lg text-center">
            <p className="text-sm text-orange-700 dark:text-orange-300">
              {t("combo_broken")}
            </p>
          </div>
        )}

        <p className="text-muted-foreground text-center mb-6">
          {t("enter_donation")}
        </p>

        <div className="max-w-xs mx-auto space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              {t("donation_amount")}
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={donationAmount}
              onChange={(e) => setDonationAmount(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border bg-background"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {t("min_donation")}
            </p>
          </div>

          {needsApproval ? (
            <Button
              className="w-full"
              onClick={handleApprove}
              disabled={isApproving || isApproveConfirming}
            >
              {isApproving || isApproveConfirming ? t("approving") : t("approve_uu")}
            </Button>
          ) : (
            <Button
              className="w-full"
              onClick={handleCheckIn}
              disabled={isCheckingIn || isCheckInConfirming || Number(donationAmount) < 1}
            >
              {isCheckingIn || isCheckInConfirming ? t("checking_in") : t("confirm_checkin")}
            </Button>
          )}
        </div>

        {isCheckInSuccess && (
          <p className="text-center text-green-600 mt-4">{t("checkin_success")}</p>
        )}
      </RoughCard>
    );
  }

  return null;
}
