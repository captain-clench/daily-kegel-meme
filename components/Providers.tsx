"use client";

import { ThemeProvider } from "@/components/ThemeProvider";
import { WagmiProvider } from "wagmi";
import { config } from "@/lib/wagmi/config";
import StoreProvider from "@/stores";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import i18n, { I18nLocalCache } from '@/i18n'
import { I18nextProvider } from 'react-i18next'
import { useEffect, useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  useEffect(() => {
    if (typeof window === 'undefined') return
    i18n.changeLanguage(I18nLocalCache.getI18nLng() as 'en' | 'zh')
  }, [])

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      <I18nextProvider i18n={i18n}>
        <QueryClientProvider client={queryClient}>
          <WagmiProvider config={config}>
            <StoreProvider>{children}</StoreProvider>
          </WagmiProvider>
        </QueryClientProvider>
      </I18nextProvider>
    </ThemeProvider>
  );
}
