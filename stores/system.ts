"use client";

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createContainer } from 'unstated-next'

interface useSystemProps {
  isMobile: boolean
  isClient: boolean
  screenWidth: number
  screenHeight: number
  isWalletConnectDialogOpen: boolean
  openWalletConnectDialog: () => void
  closeWalletConnectDialog: () => void
}

function useSystem(): useSystemProps {
  const [isClient, setIsClient] = useState(false)
  const [screenWidth, setScreenWidth] = useState(0)
  const [screenHeight, setScreenHeight] = useState(0)
  const [isWalletConnectDialogOpen, setIsWalletConnectDialogOpen] = useState(false)

  // Detect if code is running on client side
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsClient(true)
  }, [])

  // Detect screen size and mobile device
  useEffect(() => {
    if (!isClient) return

    const updateScreenSize = () => {
      setScreenWidth(window.innerWidth)
      setScreenHeight(window.innerHeight)
    }

    // Initial size
    updateScreenSize()

    // Listen for resize events
    window.addEventListener('resize', updateScreenSize)

    return () => {
      window.removeEventListener('resize', updateScreenSize)
    }
  }, [isClient])

  // Mobile detection based on screen width (768px is common mobile breakpoint)
  const isMobile = useMemo(() => {
    return isClient && screenWidth > 0 && screenWidth < 768
  }, [isClient, screenWidth])

  // Wallet connect dialog handlers
  const openWalletConnectDialog = useCallback(() => {
    setIsWalletConnectDialogOpen(true)
  }, [])

  const closeWalletConnectDialog = useCallback(() => {
    setIsWalletConnectDialogOpen(false)
  }, [])

  return {
    isMobile,
    isClient,
    screenWidth,
    screenHeight,
    isWalletConnectDialogOpen,
    openWalletConnectDialog,
    closeWalletConnectDialog,
  }
}

const System = createContainer(useSystem)

export default System
