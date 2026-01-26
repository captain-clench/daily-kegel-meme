"use client";

import React from 'react'
import System from './system'
import Web3 from './web3'

export default function StoreProvider({ children }: { children: React.ReactNode }) {
  return (
    <System.Provider>
      <Web3.Provider>
        {children}
      </Web3.Provider>
    </System.Provider>
  )
}
