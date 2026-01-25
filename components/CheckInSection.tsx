"use client";

import { useState, useEffect } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits } from "viem";
import { DailyKegelABI } from "@/lib/abi/DailyKegel";
import { ERC20ABI } from "@/lib/abi/ERC20";
import { Button } from "@/components/ui/button";
import { TrainingFlow } from "@/components/TrainingFlow";

interface Props {
  contractAddress: `0x${string}`;
  tokenAddress: `0x${string}`;
  trainingCompleted: boolean;
  onTrainingComplete: () => void;
}

// 格式化时间显示
function formatDateTime(timestamp: number) {
  const date = new Date(timestamp * 1000);
  return date.toLocaleString("zh-CN", {
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
  const [donationAmount, setDonationAmount] = useState("1");
  const [isTraining, setIsTraining] = useState(false);

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
      args: [contractAddress, donationInWei],
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
      <div className="bg-card rounded-lg p-8 text-center border">
        <h3 className="text-xl font-semibold mb-2">今日已打卡</h3>

        {/* 当前 Combo */}
        {currentCombo > 0n && (
          <div className="mb-4">
            <span className="text-sm text-muted-foreground">当前 Combo</span>
            <p className="text-3xl font-bold text-primary">{currentCombo.toString()}</p>
          </div>
        )}

        {/* 下次打卡倒计时 */}
        <div className="mb-4">
          <p className="text-sm text-muted-foreground mb-1">下次打卡倒计时</p>
          <p className="text-4xl font-mono font-bold">{cooldownCountdown}</p>
          {nextCheckinTime && (
            <p className="text-xs text-muted-foreground mt-1">
              {formatDateTime(Number(nextCheckinTime))} 可打卡
            </p>
          )}
        </div>

        {/* Combo 截止时间 */}
        {isInComboWindow && comboCountdown && (
          <div className="mt-6 p-4 bg-green-50 dark:bg-green-950 rounded-lg">
            <p className="text-sm text-green-700 dark:text-green-300 mb-1">
              Combo 接续截止
            </p>
            <p className="text-2xl font-mono font-bold text-green-600 dark:text-green-400">
              {comboCountdown}
            </p>
            {comboDeadline && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                在 {formatDateTime(Number(comboDeadline))} 前打卡可接续 Combo
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  // 如果可以打卡且训练未完成，显示训练入口
  if (!trainingCompleted && canCheckIn) {
    if (isTraining) {
      return (
        <TrainingFlow
          onComplete={() => {
            setIsTraining(false);
            onTrainingComplete();
          }}
        />
      );
    }

    return (
      <div className="bg-card rounded-lg p-8 text-center border">
        <h3 className="text-xl font-semibold mb-2">开始今日训练</h3>
        <p className="text-muted-foreground mb-4">
          完成凯格尔训练后即可打卡
        </p>

        {/* Combo 提示 */}
        {hasCheckedInBefore && isInComboWindow && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-950 rounded-lg">
            <p className="text-sm text-green-700 dark:text-green-300">
              当前 Combo: <span className="font-bold">{currentCombo.toString()}</span>
            </p>
            {comboCountdown && (
              <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                在 {comboCountdown} 内完成打卡，Combo +1！
              </p>
            )}
          </div>
        )}

        {hasCheckedInBefore && !isInComboWindow && (
          <div className="mb-6 p-4 bg-orange-50 dark:bg-orange-950 rounded-lg">
            <p className="text-sm text-orange-700 dark:text-orange-300">
              Combo 已断裂，打卡将开始新的 Combo
            </p>
          </div>
        )}

        <Button size="lg" onClick={() => setIsTraining(true)}>
          开始训练
        </Button>
      </div>
    );
  }

  // 训练完成，显示打卡表单
  if (trainingCompleted && canCheckIn) {
    return (
      <div className="bg-card rounded-lg p-8 border">
        <h3 className="text-xl font-semibold mb-4 text-center">训练完成！</h3>

        {/* Combo 提示 */}
        {hasCheckedInBefore && isInComboWindow && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-950 rounded-lg text-center">
            <p className="text-sm text-green-700 dark:text-green-300">
              当前 Combo: <span className="font-bold">{currentCombo.toString()}</span>
            </p>
            <p className="text-sm text-green-600 dark:text-green-400 mt-1">
              打卡后 Combo 将变为 {(currentCombo + 1n).toString()}！
            </p>
          </div>
        )}

        {hasCheckedInBefore && !isInComboWindow && (
          <div className="mb-6 p-4 bg-orange-50 dark:bg-orange-950 rounded-lg text-center">
            <p className="text-sm text-orange-700 dark:text-orange-300">
              Combo 已断裂，打卡将开始新的 Combo
            </p>
          </div>
        )}

        <p className="text-muted-foreground text-center mb-6">
          输入捐赠数量完成打卡
        </p>

        <div className="max-w-xs mx-auto space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              捐赠数量 (UU)
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
              最低 1 UU
            </p>
          </div>

          {needsApproval ? (
            <Button
              className="w-full"
              onClick={handleApprove}
              disabled={isApproving || isApproveConfirming}
            >
              {isApproving || isApproveConfirming ? "授权中..." : "授权 UU"}
            </Button>
          ) : (
            <Button
              className="w-full"
              onClick={handleCheckIn}
              disabled={isCheckingIn || isCheckInConfirming || Number(donationAmount) < 1}
            >
              {isCheckingIn || isCheckInConfirming ? "打卡中..." : "确认打卡"}
            </Button>
          )}
        </div>

        {isCheckInSuccess && (
          <p className="text-center text-green-600 mt-4">打卡成功！</p>
        )}
      </div>
    );
  }

  return null;
}
