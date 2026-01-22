"use client";

import { useState, useEffect } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { Button } from "@/components/ui/button";

export function ConnectWalletDialog() {
  const [mounted, setMounted] = useState(false);
  const { address, isConnected } = useAccount();
  const { connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  useEffect(() => {
    setMounted(true);
  }, []);

  // 防止 hydration 不匹配，客户端挂载前显示加载状态
  if (!mounted) {
    return (
      <div className="flex flex-col gap-2">
        <Button disabled className="w-full">
          加载中...
        </Button>
      </div>
    );
  }

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">
          {address.slice(0, 6)}...{address.slice(-4)}
        </span>
        <Button variant="outline" size="sm" onClick={() => disconnect()}>
          断开连接
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {connectors.map((connector) => (
        <Button
          key={connector.uid}
          onClick={() => connect({ connector })}
          disabled={isPending}
          className="w-full"
        >
          {isPending ? "连接中..." : `连接 ${connector.name}`}
        </Button>
      ))}
    </div>
  );
}
