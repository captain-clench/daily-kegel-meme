import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const seasons = await prisma.season.findMany({
      where: { active: true },
      orderBy: { startTime: "desc" },
      select: {
        id: true,
        name: true,
        displayName: true,
        contractAddress: true,
        tokenAddress: true,
        chainId: true,
        startTime: true,
        endTime: true,
      },
    });

    return NextResponse.json({ seasons });
  } catch (error) {
    console.error("Failed to fetch seasons:", error);
    return NextResponse.json(
      { error: "Failed to fetch seasons" },
      { status: 500 }
    );
  }
}
