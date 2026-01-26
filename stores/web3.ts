"use client";

import { useState, useEffect, useMemo } from 'react'
import { createContainer } from 'unstated-next'
import { type Config, useConnection, useConnectors, useConnectorClient, useClient } from 'wagmi'
import { JsonRpcApiProvider, Provider, JsonRpcSigner, BrowserProvider, JsonRpcProvider, FallbackProvider } from 'ethers'
import type { Account, Chain, Client, Transport } from 'viem'

interface useWeb3Props {
  // Connection status
  isConnected: boolean
  isConnecting: boolean

  // Account info
  connectedAddress: string | undefined
  connectedChainId: number | undefined

  // Ethers.js wallet for contract interactions
  connectedWallet: JsonRpcSigner | null
  provider: Provider | null
}

export function clientToProvider(client: Client<Transport, Chain>) {
  const { chain, transport } = client
  const network = {
    chainId: chain.id,
    name: chain.name,
    ensAddress: chain.contracts?.ensRegistry?.address,
  }
  if (transport.type === 'fallback') {
    const providers = (transport.transports as ReturnType<Transport>[]).map(
      ({ value }) => new JsonRpcProvider(value?.url, network),
    )
    if (providers.length === 1) return providers[0]
    return new FallbackProvider(providers)
  }
  return new JsonRpcProvider(transport.url, network)
}

/** Action to convert a viem Client to an ethers.js Provider. */
export function useEthersProvider({ chainId }: { chainId?: number } = {}) {
  const client = useClient<Config>({ chainId })
  return useMemo(() => (client ? clientToProvider(client) : null), [client])
}

export function clientToSigner(client: Client<Transport, Chain, Account>) {
  const { account, chain, transport } = client
  const network = {
    chainId: chain.id,
    name: chain.name,
    ensAddress: chain.contracts?.ensRegistry?.address,
  }
  const provider = new BrowserProvider(transport, network)
  const signer = new JsonRpcSigner(provider, account.address)
  return signer
}

/** Hook to convert a viem Wallet Client to an ethers.js Signer. */
export function useEthersSigner({ chainId }: { chainId?: number } = {}) {
  const { data: client } = useConnectorClient<Config>({ chainId })
  return useMemo(() => (client ? clientToSigner(client) : null), [client])
}
interface useEthersSignerOptions {
  chainId?: number
}

function useWeb3(): useWeb3Props {
  const connection = useConnection()
  const connectors = useConnectors()
  const { data: client } = useConnectorClient()

  const connectedWallet = useEthersSigner()
  const provider = useMemo(() => {
    if (!connectedWallet) return null
    return connectedWallet.provider
  }, [connectedWallet])

  // Extract connection status
  const isConnected = useMemo(() => {
    return connection.status === 'connected'
  }, [connection.status])

  const isConnecting = useMemo(() => {
    return connection.status === 'connecting' || connection.status === 'reconnecting'
  }, [connection.status])

  // Extract account address
  const connectedAddress = useMemo(() => {
    return connection.address
  }, [connection.address])

  // Extract chain ID
  const connectedChainId = useMemo(() => {
    return connection.chainId
  }, [connection.chainId])

  return {
    isConnected,
    isConnecting,
    connectedAddress,
    connectedChainId,
    connectedWallet,
    provider,
  }
}

const Web3 = createContainer(useWeb3)

export default Web3
