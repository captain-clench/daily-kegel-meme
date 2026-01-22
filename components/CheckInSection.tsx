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

  const { data: nextCheckinTime } = useReadContract({
    address: contractAddress,
    abi: DailyKegelABI,
    functionName: "nextCheckinTime",
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
    }
  }, [isCheckInSuccess, refetchCanCheckIn]);

  const donationInWei = parseUnits(donationAmount || "0", 18);
  const needsApproval = !allowance || allowance < donationInWei;

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

  // Countdown timer
  const [countdown, setCountdown] = useState("");
  useEffect(() => {
    if (!nextCheckinTime || canCheckIn) return;

    const updateCountdown = () => {
      const now = Math.floor(Date.now() / 1000);
      const target = Number(nextCheckinTime);
      const diff = target - now;

      if (diff <= 0) {
        setCountdown("");
        refetchCanCheckIn();
        return;
      }

      const hours = Math.floor(diff / 3600);
      const minutes = Math.floor((diff % 3600) / 60);
      const seconds = diff % 60;
      setCountdown(`${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [nextCheckinTime, canCheckIn, refetchCanCheckIn]);

  // If can't check in, show countdown
  if (!canCheckIn && countdown) {
    return (
      <div className="bg-card rounded-lg p-8 text-center border">
        <h3 className="text-xl font-semibold mb-2">今日已打卡</h3>
        <p className="text-muted-foreground mb-4">下次打卡倒计时</p>
        <p className="text-4xl font-mono font-bold">{countdown}</p>
      </div>
    );
  }

  // If training not completed and can check in, show training
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
        <p className="text-muted-foreground mb-6">
          完成凯格尔训练后即可打卡
        </p>
        <Button size="lg" onClick={() => setIsTraining(true)}>
          开始训练
        </Button>
      </div>
    );
  }

  // Training completed, show check-in form
  if (trainingCompleted && canCheckIn) {
    return (
      <div className="bg-card rounded-lg p-8 border">
        <h3 className="text-xl font-semibold mb-4 text-center">训练完成！</h3>
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
