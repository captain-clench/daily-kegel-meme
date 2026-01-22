import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SeasonClient } from "./SeasonClient";

interface Props {
  params: Promise<{ name: string }>;
}

async function getSeason(name: string) {
  const season = await prisma.season.findUnique({
    where: { name },
  });
  return season;
}

export default async function SeasonPage({ params }: Props) {
  const { name } = await params;
  const season = await getSeason(name);

  if (!season) {
    notFound();
  }

  return (
    <SeasonClient
      season={{
        id: season.id,
        name: season.name,
        displayName: season.displayName,
        contractAddress: season.contractAddress,
        tokenAddress: season.tokenAddress,
        chainId: season.chainId,
        startTime: season.startTime.getTime(),
        endTime: season.endTime.getTime(),
      }}
    />
  );
}
