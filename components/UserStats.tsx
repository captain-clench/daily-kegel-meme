"use client";

import { useAccount, useReadContract } from "wagmi";
import { DailyKegelABI } from "@/lib/abi/DailyKegel";
import { ERC20ABI } from "@/lib/abi/ERC20";
import { formatUnits } from "viem";

interface Props {
  contractAddress: `0x${string}`;
  tokenAddress: `0x${string}`;
}

export function UserStats({ contractAddress, tokenAddress }: Props) {
  const { address } = useAccount();

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
    <div className="bg-card rounded-lg p-6 border">
      <h3 className="font-semibold mb-4">我的数据</h3>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div>
          <p className="text-sm text-muted-foreground">当前 Combo</p>
          <p className="text-2xl font-bold text-primary">{currentCombo.toString()}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">打卡次数</p>
          <p className="text-2xl font-bold">{checkinCount.toString()}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">捐赠总量</p>
          <p className="text-2xl font-bold">
            {formatUnits(donationTotal, 18)} UU
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">UU 余额</p>
          <p className="text-2xl font-bold">
            {tokenBalance ? formatUnits(tokenBalance, 18) : "0"} UU
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">累计捐赠池</p>
          <p className="text-2xl font-bold">
            {totalPool ? formatUnits(totalPool, 18) : "0"} UU
          </p>
        </div>
      </div>
    </div>
  );
}
