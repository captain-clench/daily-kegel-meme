"use client";

import { useAccount, useReadContract } from "wagmi";
import { DailyKegelABI } from "@/lib/abi/DailyKegel";
import { ERC20ABI } from "@/lib/abi/ERC20";
import { formatUnits } from "viem";
import useTrans from "@/hooks/useTrans";
import { RoughCard } from "@/components/ui/rough-card";

interface Props {
  contractAddress: `0x${string}`;
  tokenAddress: `0x${string}`;
}

export function UserStats({ contractAddress, tokenAddress }: Props) {
  const { address } = useAccount();
  const { t } = useTrans("stats");

  const { data: userData } = useReadContract({
    address: contractAddress,
    abi: DailyKegelABI,
    functionName: "userData",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: totalPool } = useReadContract({
    address: contractAddress,
    abi: DailyKegelABI,
    functionName: "totalPool",
  });

  const { data: tokenBalance } = useReadContract({
    address: tokenAddress,
    abi: ERC20ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const checkinCount = userData?.[0] ?? 0n;
  const donationTotal = userData?.[1] ?? 0n;
  const currentCombo = userData?.[3] ?? 0n;

  return (
    <RoughCard className="p-6" roughOptions={{ roughness: 1.2, bowing: 0.8, fill: '#ffcccc', fillStyle: 'hachure', hachureGap: 5, fillWeight: 3 }} animate animateInterval={200} solidBackgroundFill="#ffefefc9">
      <h3 className="text-xl font-bold mb-6">{t("my_data")}</h3>
      <div className="space-y-5">
        <div>
          <p className="text-lg font-medium text-muted-foreground">{t("current_combo")}</p>
          <p className="text-3xl font-extrabold text-primary">{currentCombo.toString()}</p>
        </div>
        <div>
          <p className="text-lg font-medium text-muted-foreground">{t("checkin_count")}</p>
          <p className="text-3xl font-extrabold">{checkinCount.toString()}</p>
        </div>
        <div>
          <p className="text-lg font-medium text-muted-foreground">{t("total_donation")}</p>
          <p className="text-3xl font-extrabold">{formatUnits(donationTotal, 18)} UU</p>
        </div>
        <div>
          <p className="text-lg font-medium text-muted-foreground">{t("uu_balance")}</p>
          <p className="text-3xl font-extrabold">{tokenBalance ? formatUnits(tokenBalance, 18) : "0"} UU</p>
        </div>
        <div>
          <p className="text-lg font-medium text-muted-foreground">{t("total_pool")}</p>
          <p className="text-3xl font-extrabold">{totalPool ? formatUnits(totalPool, 18) : "0"} UU</p>
        </div>
      </div>
    </RoughCard>
  );
}
