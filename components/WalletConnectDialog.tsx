"use client";

import { useEffect } from "react";
import { useConnect, useConnectors, useSwitchChain } from "wagmi";
import type { Connector } from "wagmi";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Wallet } from "lucide-react";
import useTrans from "@/hooks/useTrans";
import System from "@/stores/system";
import Web3 from "@/stores/web3";
import { activeChain } from "@/lib/wagmi/config";

export function WalletConnectDialog() {
  const { isWalletConnectDialogOpen, closeWalletConnectDialog } = System.useContainer();
  const { isConnected, connectedChainId } = Web3.useContainer();
  const connectors = useConnectors();
  const { connect, status, error } = useConnect();
  const { switchChain } = useSwitchChain();
  const { t } = useTrans("wallet");

  // Close dialog when connection is successful
  useEffect(() => {
    if (status === "success" && isWalletConnectDialogOpen) {
      closeWalletConnectDialog();
    }
  }, [status, isWalletConnectDialogOpen, closeWalletConnectDialog]);

  // Auto-switch to active chain after connection
  useEffect(() => {
    if (isConnected && connectedChainId && connectedChainId !== activeChain.id && switchChain) {
      switchChain({ chainId: activeChain.id });
    }
  }, [isConnected, connectedChainId, switchChain]);

  const handleConnect = async (connector: Connector) => {
    try {
      connect({ 
        connector,
        chainId: activeChain.id,
      });
    } catch (err) {
      console.error("Failed to connect:", err);
    }
  };

  return (
    <Dialog open={isWalletConnectDialogOpen} onOpenChange={closeWalletConnectDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("connect_wallet")}</DialogTitle>
          <DialogDescription>
            {t("choose_wallet")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 mt-4">
          {connectors.map((connector) => (
            <Button
              key={connector.id}
              onClick={() => handleConnect(connector)}
              variant="outline"
              className="w-full justify-start"
              disabled={status === "pending"}
            >
              {/* TODO: Replace with actual wallet logo */}
              <div className="w-6 h-6 rounded-full bg-gray-300 mr-3 flex items-center justify-center">
                <Wallet className="h-3 w-3" />
              </div>
              {connector.name}
            </Button>
          ))}
        </div>

        {error && (
          <div className="mt-4 p-3 bg-destructive/10 border border-destructive rounded-md">
            <p className="text-sm text-destructive">
              {error.message || t("connection_failed")}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
