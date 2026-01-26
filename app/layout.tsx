import type { Metadata } from "next";
import { Geist, Geist_Mono, Architects_Daughter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { WalletConnectDialog } from "@/components/WalletConnectDialog";

const libreBaskerville = Architects_Daughter({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: "400",
});


// const geistSans = Geist({
//   variable: "--font-geist-sans",
//   subsets: ["latin"],
// });

// const geistMono = Geist_Mono({
//   variable: "--font-geist-mono",
//   subsets: ["latin"],
// });

export const metadata: Metadata = {
  title: "DailyKegel - 每日凯格尔运动打卡",
  description: "DailyKegel 激励你每日进行凯格尔运动，锻炼盆底肌群，增强身体健康",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        className={`${libreBaskerville.variable} antialiased`}
      >
        <Providers>
          {children}
          <WalletConnectDialog />
        </Providers>
      </body>
    </html>
  );
}
