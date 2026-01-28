"use client";

import * as React from "react";
import { useReadContract, useSignMessage } from "wagmi";
import { DailyKegelABI } from "@/lib/abi/DailyKegel";
import { formatUnits } from "viem";
import useTrans from "@/hooks/useTrans";
import { RoughTabs, RoughTabsList, RoughTabsTrigger, RoughTabsContent } from "@/components/ui/rough-tabs";
import { RoughCard } from "@/components/ui/rough-card";
import { RoughNotation } from "react-rough-notation";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import Markdown from "marked-react";
import rough from "roughjs";
import Web3 from "@/stores/web3";
import { Pencil } from "lucide-react";

interface Props {
  contractAddress: `0x${string}`;
}

type LeaderboardEntry = {
  user: `0x${string}`;
  value: bigint;
};

type ComboEntry = {
  user: `0x${string}`;
  startBlock: bigint;
  comboCount: bigint;
};

// Rough 风格的排名图标
function RoughRankIcon({ rank, size = 28 }: { rank: number; size?: number }) {
  const svgRef = React.useRef<SVGSVGElement>(null);
  const [seed] = React.useState(() => Math.floor(Math.random() * 10000));

  const colors = [
    { fill: "#fbbf24", stroke: "#b45309" }, // 金色
    { fill: "#d1d5db", stroke: "#4b5563" }, // 银色
    { fill: "#d97706", stroke: "#92400e" }, // 铜色
  ];
  const color = colors[rank - 1] || { fill: "#e5e7eb", stroke: "#6b7280" };

  React.useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    while (svg.firstChild) {
      svg.removeChild(svg.firstChild);
    }

    const rc = rough.svg(svg);
    const circle = rc.circle(size / 2, size / 2, size - 4, {
      fill: color.fill,
      fillStyle: "solid",
      stroke: color.stroke,
      strokeWidth: size > 40 ? 2 : 1.5,
      roughness: 1.5,
      seed,
    });
    svg.appendChild(circle);
  }, [color.fill, color.stroke, seed, size]);

  return (
    <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: size, height: size }}>
      <svg
        ref={svgRef}
        width={size}
        height={size}
        className="absolute inset-0"
      />
      <span
        className="relative z-10 font-bold"
        style={{ color: color.stroke, fontSize: size * 0.4 }}
      >
        {rank}
      </span>
    </div>
  );
}

// 地址显示组件
function AddressDisplay({
  address,
  isMe,
  showMeLabel = true,
}: {
  address: string;
  isMe: boolean;
  showMeLabel?: boolean;
}) {
  const { t } = useTrans("leaderboard");
  const displayAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;

  if (isMe) {
    return (
      <RoughNotation type="highlight" show={true} color="#fef08a" animationDuration={500}>
        <span className="font-mono text-sm">
          {showMeLabel && <span className="text-primary font-bold">({t("me")}) </span>}
          {displayAddress}
        </span>
      </RoughNotation>
    );
  }

  return (
    <span className="font-mono text-sm">
      {displayAddress}
    </span>
  );
}

// Quote 显示和编辑组件
function QuoteDisplay({
  address,
  quote,
  isMe,
  onQuoteUpdate,
}: {
  address: string;
  quote?: string;
  isMe: boolean;
  onQuoteUpdate: (address: string, newQuote: string) => void;
}) {
  const { t } = useTrans("leaderboard");
  const [isEditing, setIsEditing] = React.useState(false);
  const [inputValue, setInputValue] = React.useState(quote || "");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { signMessageAsync } = useSignMessage();

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const nonce = Math.random().toString(36).substring(2, 15);
      const message = `Update my quote on Captain Clench\n\nQuote: ${inputValue}\nNonce: ${nonce}`;

      const signature = await signMessageAsync({ message });

      const response = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address,
          nonce,
          signature,
          quote: inputValue,
        }),
      });

      if (response.ok) {
        onQuoteUpdate(address, inputValue);
        setIsEditing(false);
      }
    } catch (error) {
      console.error("Failed to update quote:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Tooltip open>
          <TooltipTrigger asChild>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={t("enter_quote")}
              className="flex-1 min-w-0 px-2 py-1 text-sm border rounded bg-background"
              autoFocus
            />
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={8}>
            {t("quote_tooltip")}
          </TooltipContent>
        </Tooltip>
        <Button
          size="sm"
          variant="outline"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="flex-shrink-0"
        >
          {isSubmitting ? "..." : t("save")}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setIsEditing(false);
            setInputValue(quote || "");
          }}
          className="flex-shrink-0"
        >
          {t("cancel")}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-1 min-w-0">
      {quote ? (
        <span className="text-sm text-muted-foreground italic truncate [&_p]:inline [&_a]:text-primary [&_a]:underline [&_img]:inline [&_img]:h-[1.3em] [&_img]:w-auto [&_img]:align-middle">
          <Markdown>{quote}</Markdown>
        </span>
      ) : isMe ? (
        <span className="text-sm text-muted-foreground/50">{t("add_quote_hint")}</span>
      ) : null}
      {isMe && (
        <button
          onClick={() => setIsEditing(true)}
          className="text-muted-foreground hover:text-primary flex-shrink-0 p-1"
          title={quote ? t("edit") : t("add")}
        >
          <Pencil className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

export function Leaderboard({ contractAddress }: Props) {
  const { t, tCommon } = useTrans("leaderboard");
  const { connectedAddress } = Web3.useContainer();
  const [quotes, setQuotes] = React.useState<Record<string, string>>({});

  const { data: checkinLeaderboard } = useReadContract({
    address: contractAddress,
    abi: DailyKegelABI,
    functionName: "getCheckinLeaderboard",
  });

  const { data: donationLeaderboard } = useReadContract({
    address: contractAddress,
    abi: DailyKegelABI,
    functionName: "getDonationLeaderboard",
  });

  const { data: comboLeaderboard } = useReadContract({
    address: contractAddress,
    abi: DailyKegelABI,
    functionName: "getComboLeaderboard",
  });

  // 过滤排行榜数据
  const filteredCheckin = React.useMemo(() =>
    (checkinLeaderboard as LeaderboardEntry[] | undefined)?.filter(
      (entry) => entry.user !== "0x0000000000000000000000000000000000000000" && entry.value > 0n
    ) ?? []
  , [checkinLeaderboard]);

  const filteredDonation = React.useMemo(() =>
    (donationLeaderboard as LeaderboardEntry[] | undefined)?.filter(
      (entry) => entry.user !== "0x0000000000000000000000000000000000000000" && entry.value > 0n
    ) ?? []
  , [donationLeaderboard]);

  const filteredCombo = React.useMemo(() =>
    (comboLeaderboard as ComboEntry[] | undefined)?.filter(
      (entry) => entry.user !== "0x0000000000000000000000000000000000000000" && entry.comboCount > 0n
    ) ?? []
  , [comboLeaderboard]);

  // 收集所有地址用于查询 quotes
  const allAddressesKey = React.useMemo(() => {
    const allAddresses = new Set<string>();
    filteredCheckin.forEach((e) => allAddresses.add(e.user.toLowerCase()));
    filteredDonation.forEach((e) => allAddresses.add(e.user.toLowerCase()));
    filteredCombo.forEach((e) => allAddresses.add(e.user.toLowerCase()));
    return Array.from(allAddresses).sort().join(",");
  }, [filteredCheckin, filteredDonation, filteredCombo]);

  // 获取所有地址并批量查询 quotes
  React.useEffect(() => {
    if (!allAddressesKey) return;

    const addresses = allAddressesKey.split(",");
    fetch("/api/quote/batch_query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addresses }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setQuotes(data.data);
        }
      })
      .catch(console.error);
  }, [allAddressesKey]);

  const isMyAddress = (address: string) => {
    return connectedAddress?.toLowerCase() === address.toLowerCase();
  };

  const handleQuoteUpdate = (address: string, newQuote: string) => {
    setQuotes((prev) => ({
      ...prev,
      [address.toLowerCase()]: newQuote,
    }));
  };

  // 获取各榜单第一名
  const comboChampion = filteredCombo[0];
  const checkinChampion = filteredCheckin[0];
  const donationChampion = filteredDonation[0];

  const hasAnyChampion = comboChampion || checkinChampion || donationChampion;

  return (
    <RoughCard className="p-6 max-w-[1200px] mx-auto" roughOptions={{ roughness: 2, bowing: 0.8, fill: '#e8f4ff', fillStyle: 'hachure', hachureGap: 5, fillWeight: 3 }}>
      {/* Top Champions */}
      {hasAnyChampion && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* Combo Champion */}
          {comboChampion && (
            <RoughCard className="p-4 text-center" roughOptions={{ roughness: 2, bowing: 0.8, fill: '#fef3c7', fillStyle: 'hachure', hachureGap: 5, fillWeight: 3 }}>
              <div className="flex justify-center">
                <RoughRankIcon rank={1} size={48} />
              </div>
              <p className="font-bold text-lg mt-2">{t("title_combo")}</p>
              <p className="font-mono text-sm text-muted-foreground">
                {comboChampion.user.slice(0, 6)}...{comboChampion.user.slice(-4)}
              </p>
              {quotes[comboChampion.user.toLowerCase()] && (
                <p className="text-xs text-muted-foreground italic mt-1 truncate [&_p]:inline [&_img]:inline [&_img]:h-[1.3em] [&_img]:w-auto">
                  <Markdown>{quotes[comboChampion.user.toLowerCase()]}</Markdown>
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                {t("champion_desc_combo", { count: comboChampion.comboCount.toString() })}
              </p>
            </RoughCard>
          )}

          {/* Checkin Champion */}
          {checkinChampion && (
            <RoughCard className="p-4 text-center" roughOptions={{ roughness: 2, bowing: 0.8, fill: '#d1fae5', fillStyle: 'hachure', hachureGap: 5, fillWeight: 3 }}>
              <div className="flex justify-center">
                <RoughRankIcon rank={1} size={48} />
              </div>
              <p className="font-bold text-lg mt-2">{t("title_checkin")}</p>
              <p className="font-mono text-sm text-muted-foreground">
                {checkinChampion.user.slice(0, 6)}...{checkinChampion.user.slice(-4)}
              </p>
              {quotes[checkinChampion.user.toLowerCase()] && (
                <p className="text-xs text-muted-foreground italic mt-1 truncate [&_p]:inline [&_img]:inline [&_img]:h-[1.3em] [&_img]:w-auto">
                  <Markdown>{quotes[checkinChampion.user.toLowerCase()]}</Markdown>
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                {t("champion_desc_checkin", { count: checkinChampion.value.toString() })}
              </p>
            </RoughCard>
          )}

          {/* Donation Champion */}
          {donationChampion && (
            <RoughCard className="p-4 text-center" roughOptions={{ roughness: 2, bowing: 0.8, fill: '#f3e8ff', fillStyle: 'hachure', hachureGap: 5, fillWeight: 3 }}>
              <div className="flex justify-center">
                <RoughRankIcon rank={1} size={48} />
              </div>
              <p className="font-bold text-lg mt-2">{t("title_donation")}</p>
              <p className="font-mono text-sm text-muted-foreground">
                {donationChampion.user.slice(0, 6)}...{donationChampion.user.slice(-4)}
              </p>
              {quotes[donationChampion.user.toLowerCase()] && (
                <p className="text-xs text-muted-foreground italic mt-1 truncate [&_p]:inline [&_img]:inline [&_img]:h-[1.3em] [&_img]:w-auto">
                  <Markdown>{quotes[donationChampion.user.toLowerCase()]}</Markdown>
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                {t("champion_desc_donation", { amount: formatUnits(donationChampion.value, 18) })}
              </p>
            </RoughCard>
          )}
        </div>
      )}

      <RoughTabs defaultValue="combo">
        <RoughTabsList className="mb-6 flex-wrap justify-center">
          <RoughTabsTrigger value="combo" color="#333" strokeWidth={2}>
            {t("combo_streak")}
          </RoughTabsTrigger>
          <RoughTabsTrigger value="checkin" color="#333" strokeWidth={2}>
            {t("checkin_count")}
          </RoughTabsTrigger>
          <RoughTabsTrigger value="donation" color="#333" strokeWidth={2}>
            {t("donation_amount")}
          </RoughTabsTrigger>
        </RoughTabsList>

        {/* Combo Leaderboard */}
        <RoughTabsContent value="combo" className="mt-0">
          {filteredCombo.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">{tCommon("no_data")}</p>
          ) : (
            <div className="space-y-2">
              {filteredCombo.map((entry, index) => (
                <div
                  key={`${entry.user}-${entry.startBlock}`}
                  className="flex items-center gap-3 py-3 px-4 rounded-lg bg-muted/50"
                >
                  <RoughRankIcon rank={index + 1} />
                  <div className="flex-shrink-0">
                    <AddressDisplay address={entry.user} isMe={isMyAddress(entry.user)} />
                    <p className="text-xs text-muted-foreground">
                      {t("from_block", { block: entry.startBlock.toString() })}
                    </p>
                  </div>
                  <QuoteDisplay
                    address={entry.user}
                    quote={quotes[entry.user.toLowerCase()]}
                    isMe={isMyAddress(entry.user)}
                    onQuoteUpdate={handleQuoteUpdate}
                  />
                  <div className="text-right flex-shrink-0">
                    <span className="font-bold text-lg">{entry.comboCount.toString()}</span>
                    <span className="text-sm text-muted-foreground ml-1">{t("streak")}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </RoughTabsContent>

        {/* Check-in Leaderboard */}
        <RoughTabsContent value="checkin" className="mt-0">
          {filteredCheckin.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">{tCommon("no_data")}</p>
          ) : (
            <div className="space-y-2">
              {filteredCheckin.map((entry, index) => (
                <div
                  key={entry.user}
                  className="flex items-center gap-3 py-3 px-4 rounded-lg bg-muted/50"
                >
                  <RoughRankIcon rank={index + 1} />
                  <div className="flex-shrink-0">
                    <AddressDisplay address={entry.user} isMe={isMyAddress(entry.user)} />
                  </div>
                  <QuoteDisplay
                    address={entry.user}
                    quote={quotes[entry.user.toLowerCase()]}
                    isMe={isMyAddress(entry.user)}
                    onQuoteUpdate={handleQuoteUpdate}
                  />
                  <div className="text-right flex-shrink-0">
                    <span className="font-bold text-lg">{entry.value.toString()}</span>
                    <span className="text-sm text-muted-foreground ml-1">{t("times")}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </RoughTabsContent>

        {/* Donation Leaderboard */}
        <RoughTabsContent value="donation" className="mt-0">
          {filteredDonation.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">{tCommon("no_data")}</p>
          ) : (
            <div className="space-y-2">
              {filteredDonation.map((entry, index) => (
                <div
                  key={entry.user}
                  className="flex items-center gap-3 py-3 px-4 rounded-lg bg-muted/50"
                >
                  <RoughRankIcon rank={index + 1} />
                  <div className="flex-shrink-0">
                    <AddressDisplay address={entry.user} isMe={isMyAddress(entry.user)} />
                  </div>
                  <QuoteDisplay
                    address={entry.user}
                    quote={quotes[entry.user.toLowerCase()]}
                    isMe={isMyAddress(entry.user)}
                    onQuoteUpdate={handleQuoteUpdate}
                  />
                  <span className="font-bold flex-shrink-0">
                    {formatUnits(entry.value, 18)} UU
                  </span>
                </div>
              ))}
            </div>
          )}
        </RoughTabsContent>
      </RoughTabs>
    </RoughCard>
  );
}
